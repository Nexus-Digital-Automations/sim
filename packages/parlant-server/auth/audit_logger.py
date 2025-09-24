"""
Authentication Audit Logging
Comprehensive logging for all authentication and authorization events
"""

import asyncio
import logging
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Types of audit events."""
    # Authentication Events
    AUTH_ATTEMPT = "auth_attempt"
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    AUTH_TOKEN_EXPIRED = "auth_token_expired"
    AUTH_INVALID_TOKEN = "auth_invalid_token"

    # Session Events
    SESSION_CREATED = "session_created"
    SESSION_VALIDATED = "session_validated"
    SESSION_EXPIRED = "session_expired"
    SESSION_TERMINATED = "session_terminated"

    # Workspace Access Events
    WORKSPACE_ACCESS_GRANTED = "workspace_access_granted"
    WORKSPACE_ACCESS_DENIED = "workspace_access_denied"
    WORKSPACE_ACCESS_CHECK = "workspace_access_check"

    # Rate Limiting Events
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    RATE_LIMIT_BLOCKED = "rate_limit_blocked"
    RATE_LIMIT_RESET = "rate_limit_reset"

    # Security Events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    MULTIPLE_FAILED_ATTEMPTS = "multiple_failed_attempts"
    BRUTE_FORCE_DETECTED = "brute_force_detected"
    IP_BLOCKED = "ip_blocked"

    # Permission Events
    PERMISSION_CHECK = "permission_check"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    ROLE_ESCALATION_ATTEMPT = "role_escalation_attempt"

    # Agent Events
    AGENT_SESSION_CREATED = "agent_session_created"
    AGENT_SESSION_ACCESSED = "agent_session_accessed"
    AGENT_CONTEXT_CREATED = "agent_context_created"


class AuditSeverity(Enum):
    """Severity levels for audit events."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AuditEvent:
    """Represents a single audit event."""
    event_id: str
    timestamp: datetime
    event_type: AuditEventType
    severity: AuditSeverity

    # Context Information
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    workspace_id: Optional[str] = None
    agent_id: Optional[str] = None
    organization_id: Optional[str] = None

    # Request Information
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None

    # Event Details
    success: Optional[bool] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = None

    # Security Context
    threat_indicators: List[str] = None
    risk_score: int = 0  # 0-100 scale

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.threat_indicators is None:
            self.threat_indicators = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert audit event to dictionary for JSON serialization."""
        data = asdict(self)
        # Convert enums to strings
        data['event_type'] = self.event_type.value
        data['severity'] = self.severity.value
        data['timestamp'] = self.timestamp.isoformat()
        return data

    def to_json(self) -> str:
        """Convert audit event to JSON string."""
        return json.dumps(self.to_dict(), default=str)


class AuditLogger:
    """
    Comprehensive audit logging system for authentication events.

    Features:
    - Structured logging with JSON output
    - Risk scoring and threat detection
    - Rate limiting integration
    - Async batch writing
    - Configurable retention policies
    """

    def __init__(self,
                 log_file_path: Optional[str] = None,
                 enable_console_output: bool = True,
                 batch_size: int = 100,
                 flush_interval_seconds: int = 60):

        self.log_file_path = log_file_path
        self.enable_console_output = enable_console_output
        self.batch_size = batch_size
        self.flush_interval_seconds = flush_interval_seconds

        # Event batching
        self._event_queue: List[AuditEvent] = []
        self._queue_lock = asyncio.Lock()

        # Background tasks
        self._flush_task: Optional[asyncio.Task] = None

        # Statistics
        self.stats = {
            "total_events": 0,
            "events_by_type": {},
            "events_by_severity": {},
            "high_risk_events": 0,
            "security_alerts": 0
        }

        # Setup logging
        self.setup_logging()
        self.start_background_tasks()

    def setup_logging(self):
        """Setup audit logging configuration."""
        if self.log_file_path:
            # Ensure log directory exists
            log_path = Path(self.log_file_path)
            log_path.parent.mkdir(parents=True, exist_ok=True)

            # Setup file handler with rotation
            import logging.handlers
            file_handler = logging.handlers.RotatingFileHandler(
                self.log_file_path,
                maxBytes=100*1024*1024,  # 100MB
                backupCount=10
            )
            file_handler.setFormatter(logging.Formatter('%(message)s'))

            # Create dedicated audit logger
            self.audit_logger = logging.getLogger('audit')
            self.audit_logger.setLevel(logging.INFO)
            self.audit_logger.addHandler(file_handler)
            self.audit_logger.propagate = False

    def start_background_tasks(self):
        """Start background tasks for batch processing."""
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._flush_worker())

    async def _flush_worker(self):
        """Background worker to flush event batches."""
        while True:
            try:
                await asyncio.sleep(self.flush_interval_seconds)
                await self.flush_events()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in audit flush worker: {e}")

    async def log_event(self, event: AuditEvent):
        """Log a single audit event."""
        async with self._queue_lock:
            self._event_queue.append(event)
            self._update_stats(event)

            # Immediate flush for critical events
            if event.severity == AuditSeverity.CRITICAL:
                await self._flush_immediately(event)

            # Batch flush when queue is full
            elif len(self._event_queue) >= self.batch_size:
                await self.flush_events()

    async def _flush_immediately(self, event: AuditEvent):
        """Immediately flush a critical event."""
        try:
            self._write_event(event)
            if self.enable_console_output:
                logger.critical(f"CRITICAL AUDIT EVENT: {event.to_json()}")
        except Exception as e:
            logger.error(f"Failed to flush critical audit event: {e}")

    async def flush_events(self):
        """Flush all queued events to storage."""
        async with self._queue_lock:
            if not self._event_queue:
                return

            events_to_flush = self._event_queue.copy()
            self._event_queue.clear()

        try:
            for event in events_to_flush:
                self._write_event(event)

            logger.debug(f"Flushed {len(events_to_flush)} audit events")

        except Exception as e:
            logger.error(f"Error flushing audit events: {e}")
            # Re-queue events on failure
            async with self._queue_lock:
                self._event_queue.extend(events_to_flush)

    def _write_event(self, event: AuditEvent):
        """Write a single event to configured outputs."""
        json_log = event.to_json()

        # Write to file if configured
        if hasattr(self, 'audit_logger'):
            self.audit_logger.info(json_log)

        # Write to console if enabled
        if self.enable_console_output:
            severity_color = {
                AuditSeverity.LOW: "",
                AuditSeverity.MEDIUM: "\033[93m",  # Yellow
                AuditSeverity.HIGH: "\033[91m",    # Red
                AuditSeverity.CRITICAL: "\033[95m" # Magenta
            }
            reset_color = "\033[0m"

            color = severity_color.get(event.severity, "")
            logger.info(f"{color}AUDIT: {json_log}{reset_color}")

    def _update_stats(self, event: AuditEvent):
        """Update audit statistics."""
        self.stats["total_events"] += 1

        # Update by type
        event_type = event.event_type.value
        self.stats["events_by_type"][event_type] = self.stats["events_by_type"].get(event_type, 0) + 1

        # Update by severity
        severity = event.severity.value
        self.stats["events_by_severity"][severity] = self.stats["events_by_severity"].get(severity, 0) + 1

        # Track high-risk events
        if event.risk_score >= 70:
            self.stats["high_risk_events"] += 1

        # Track security alerts
        if event.severity in [AuditSeverity.HIGH, AuditSeverity.CRITICAL]:
            self.stats["security_alerts"] += 1

    async def log_auth_attempt(self, user_identifier: str, success: bool,
                              ip_address: str = None, user_agent: str = None,
                              error_message: str = None, metadata: Dict[str, Any] = None):
        """Log authentication attempt."""
        event_type = AuditEventType.AUTH_SUCCESS if success else AuditEventType.AUTH_FAILURE
        severity = AuditSeverity.LOW if success else AuditSeverity.MEDIUM

        # Increase severity for repeated failures
        if not success and metadata and metadata.get('failure_count', 0) > 3:
            severity = AuditSeverity.HIGH

        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            event_type=event_type,
            severity=severity,
            user_id=user_identifier,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message,
            metadata=metadata or {},
            risk_score=self._calculate_auth_risk_score(success, metadata)
        )

        await self.log_event(event)

    async def log_session_event(self, event_type: AuditEventType, session_id: str,
                               user_id: str = None, workspace_id: str = None,
                               metadata: Dict[str, Any] = None):
        """Log session-related events."""
        severity = AuditSeverity.LOW
        if event_type in [AuditEventType.SESSION_EXPIRED, AuditEventType.SESSION_TERMINATED]:
            severity = AuditSeverity.MEDIUM

        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            session_id=session_id,
            workspace_id=workspace_id,
            metadata=metadata or {},
            success=True,
            risk_score=10  # Low risk for session events
        )

        await self.log_event(event)

    async def log_workspace_access(self, user_id: str, workspace_id: str,
                                 granted: bool, ip_address: str = None,
                                 metadata: Dict[str, Any] = None):
        """Log workspace access attempts."""
        event_type = AuditEventType.WORKSPACE_ACCESS_GRANTED if granted else AuditEventType.WORKSPACE_ACCESS_DENIED
        severity = AuditSeverity.LOW if granted else AuditSeverity.MEDIUM

        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            workspace_id=workspace_id,
            ip_address=ip_address,
            success=granted,
            metadata=metadata or {},
            risk_score=30 if not granted else 5
        )

        await self.log_event(event)

    async def log_rate_limit_event(self, identifier: str, rule_name: str,
                                 blocked: bool, ip_address: str = None,
                                 metadata: Dict[str, Any] = None):
        """Log rate limiting events."""
        event_type = AuditEventType.RATE_LIMIT_BLOCKED if blocked else AuditEventType.RATE_LIMIT_EXCEEDED
        severity = AuditSeverity.MEDIUM if blocked else AuditSeverity.LOW

        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            event_type=event_type,
            severity=severity,
            user_id=identifier,
            ip_address=ip_address,
            success=False,
            metadata={
                "rule_name": rule_name,
                **(metadata or {})
            },
            risk_score=40 if blocked else 20
        )

        await self.log_event(event)

    async def log_security_alert(self, alert_type: str, user_id: str = None,
                                ip_address: str = None, details: Dict[str, Any] = None):
        """Log security alerts and suspicious activities."""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
            severity=AuditSeverity.HIGH,
            user_id=user_id,
            ip_address=ip_address,
            success=False,
            metadata={
                "alert_type": alert_type,
                **(details or {})
            },
            threat_indicators=[alert_type],
            risk_score=80
        )

        await self.log_event(event)

    def _calculate_auth_risk_score(self, success: bool, metadata: Dict[str, Any] = None) -> int:
        """Calculate risk score for authentication events."""
        if success:
            return 5  # Successful auth is low risk

        risk_score = 30  # Base risk for failed auth

        if metadata:
            # Increase risk for repeated failures
            failure_count = metadata.get('failure_count', 0)
            risk_score += min(failure_count * 10, 50)

            # Increase risk for suspicious patterns
            if metadata.get('different_user_agents'):
                risk_score += 20
            if metadata.get('rapid_attempts'):
                risk_score += 30
            if metadata.get('suspicious_ip'):
                risk_score += 40

        return min(risk_score, 100)

    def get_stats(self) -> Dict[str, Any]:
        """Get audit logging statistics."""
        return {
            **self.stats,
            "queue_size": len(self._event_queue),
            "flush_task_running": self._flush_task and not self._flush_task.done()
        }

    async def search_events(self,
                          event_type: AuditEventType = None,
                          user_id: str = None,
                          workspace_id: str = None,
                          start_time: datetime = None,
                          end_time: datetime = None,
                          limit: int = 100) -> List[AuditEvent]:
        """Search audit events (simplified in-memory search for demo)."""
        # In production, this would query a database or log aggregation system
        # For now, return empty list as events are written to files
        logger.info(f"Audit search requested - in production this would query persistent storage")
        return []

    async def shutdown(self):
        """Shutdown audit logger and flush remaining events."""
        await self.flush_events()

        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        logger.info("Audit logger shutdown complete")


# Global audit logger instance
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get or create the global audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        # Configure audit log file path
        log_path = "/tmp/parlant_audit.jsonl"  # In production, use proper log directory
        _audit_logger = AuditLogger(log_file_path=log_path)
        logger.info("Initialized global audit logger")
    return _audit_logger


# Convenience functions for common audit events
async def audit_auth_attempt(user_id: str, success: bool, **kwargs):
    """Convenience function to log authentication attempts."""
    audit_logger = get_audit_logger()
    await audit_logger.log_auth_attempt(user_id, success, **kwargs)


async def audit_session_event(event_type: AuditEventType, session_id: str, **kwargs):
    """Convenience function to log session events."""
    audit_logger = get_audit_logger()
    await audit_logger.log_session_event(event_type, session_id, **kwargs)


async def audit_workspace_access(user_id: str, workspace_id: str, granted: bool, **kwargs):
    """Convenience function to log workspace access."""
    audit_logger = get_audit_logger()
    await audit_logger.log_workspace_access(user_id, workspace_id, granted, **kwargs)


async def audit_security_alert(alert_type: str, **kwargs):
    """Convenience function to log security alerts."""
    audit_logger = get_audit_logger()
    await audit_logger.log_security_alert(alert_type, **kwargs)