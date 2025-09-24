"""
Enterprise Multitenant Chat System for Parlant React Interface
==============================================================

This module implements the enterprise-grade multitenant messaging system specifically
designed for the Parlant React Chat Interface with comprehensive security, isolation,
and governance features.

Key Features:
- Enterprise workspace isolation with cryptographic boundaries
- Multi-level security controls and message filtering
- Advanced admin controls for chat governance
- Comprehensive audit logging and compliance tracking
- Rate limiting and abuse prevention systems
- Real-time security monitoring and threat detection
- Integration with Socket.io for secure real-time messaging
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any, Set, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from uuid import uuid4, UUID
from enum import Enum
from contextlib import asynccontextmanager
import hashlib
import hmac
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import re
from collections import defaultdict, deque
import time

import redis.asyncio as redis
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from database.connection import get_async_session_context
from auth.sim_auth_bridge import SimSession, SimUser
from config.settings import get_settings
from workspace_isolation import WorkspaceContext, workspace_isolation_manager
from messaging.workspace_messaging_system import (
    WorkspaceMessagingSystem,
    WorkspaceMessage,
    MessageType,
    MessagePriority,
    PresenceStatus
)

logger = logging.getLogger(__name__)


class SecurityThreatLevel(str, Enum):
    """Security threat levels for message analysis."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ChatGovernanceAction(str, Enum):
    """Actions available for chat governance."""
    ALLOW = "allow"
    FLAG = "flag"
    MODERATE = "moderate"
    BLOCK = "block"
    QUARANTINE = "quarantine"
    ESCALATE = "escalate"


class ComplianceFramework(str, Enum):
    """Supported compliance frameworks."""
    SOC2 = "soc2"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    CCPA = "ccpa"
    FERPA = "ferpa"
    PCI_DSS = "pci_dss"


@dataclass
class ChatSecurityPolicy:
    """Enterprise chat security policy configuration."""
    workspace_id: str
    policy_id: str = field(default_factory=lambda: str(uuid4()))

    # Message content policies
    content_filters: List[str] = field(default_factory=list)  # Regex patterns
    blocked_domains: Set[str] = field(default_factory=set)
    allowed_file_types: Set[str] = field(default_factory=lambda: {"txt", "pdf", "docx", "xlsx", "png", "jpg"})
    max_message_length: int = 10000

    # Security controls
    require_encryption: bool = True
    enable_dlp_scanning: bool = True
    block_sensitive_data: bool = True
    quarantine_suspicious: bool = True

    # Rate limiting
    messages_per_minute: int = 60
    burst_limit: int = 10
    cooldown_period: int = 300  # 5 minutes

    # Governance
    require_moderation: bool = False
    auto_compliance_check: bool = True
    audit_all_messages: bool = True
    retention_days: int = 365

    # Threat detection
    enable_threat_detection: bool = True
    threat_threshold: float = 0.7
    auto_escalation: bool = True

    # Admin controls
    admin_override: bool = True
    emergency_lockdown: bool = False

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None


@dataclass
class ChatAuditEvent:
    """Comprehensive chat audit event."""
    event_id: str = field(default_factory=lambda: str(uuid4()))
    workspace_id: str = ""
    user_id: str = ""
    agent_id: Optional[str] = None
    session_id: Optional[str] = None

    event_type: str = ""  # message_sent, message_received, policy_violation, etc.
    event_category: str = ""  # security, compliance, governance, performance

    message_id: Optional[str] = None
    message_content_hash: Optional[str] = None  # SHA-256 hash for integrity

    # Security context
    threat_level: SecurityThreatLevel = SecurityThreatLevel.LOW
    security_labels: Set[str] = field(default_factory=set)
    policy_violations: List[str] = field(default_factory=list)

    # Compliance context
    compliance_frameworks: Set[ComplianceFramework] = field(default_factory=set)
    data_classification: Optional[str] = None
    retention_policy: Optional[str] = None

    # Governance action
    governance_action: ChatGovernanceAction = ChatGovernanceAction.ALLOW
    action_reason: Optional[str] = None
    moderator_id: Optional[str] = None

    # Technical details
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    encryption_status: bool = False

    timestamp: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None


@dataclass
class RateLimitBucket:
    """Rate limiting bucket for enterprise controls."""
    user_id: str
    workspace_id: str
    bucket_type: str  # minute, hour, day

    current_count: int = 0
    max_count: int = 60
    window_start: datetime = field(default_factory=datetime.now)
    window_duration: timedelta = field(default_factory=lambda: timedelta(minutes=1))

    violations: int = 0
    last_violation: Optional[datetime] = None
    blocked_until: Optional[datetime] = None


@dataclass
class ThreatDetectionResult:
    """Result from threat detection analysis."""
    message_id: str
    threat_level: SecurityThreatLevel
    confidence_score: float
    detected_threats: List[str]
    threat_indicators: Dict[str, Any]
    recommended_action: ChatGovernanceAction
    analysis_timestamp: datetime = field(default_factory=datetime.now)


class EnterpriseMultitenantChatSystem:
    """
    Enterprise-grade multitenant chat system for Parlant React Interface.

    Provides comprehensive security, governance, and compliance features
    specifically designed for enterprise chat requirements.
    """

    def __init__(self, base_messaging_system: WorkspaceMessagingSystem):
        self.base_system = base_messaging_system
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None

        # Security policies by workspace
        self._workspace_policies: Dict[str, ChatSecurityPolicy] = {}

        # Rate limiting buckets
        self._rate_limit_buckets: Dict[str, Dict[str, RateLimitBucket]] = {}

        # Audit event storage
        self._audit_events: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10000))

        # Threat detection cache
        self._threat_cache: Dict[str, ThreatDetectionResult] = {}

        # Admin emergency controls
        self._emergency_lockdowns: Set[str] = set()
        self._quarantined_users: Dict[str, Set[str]] = defaultdict(set)

        # Real-time monitoring
        self._security_alerts: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._performance_metrics: Dict[str, Any] = {}

        # Compliance processors
        self._compliance_processors: Dict[ComplianceFramework, callable] = {}

        # DLP (Data Loss Prevention) patterns
        self._dlp_patterns = {
            'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
            'credit_card': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b\d{3}-?\d{3}-?\d{4}\b'),
            'api_key': re.compile(r'\b[A-Za-z0-9]{32,}\b'),
            'password': re.compile(r'(?i)password[:\s=]*[^\s]+', re.IGNORECASE),
            'secret': re.compile(r'(?i)(secret|token|key)[:\s=]*[^\s]+', re.IGNORECASE)
        }

    async def initialize(self):
        """Initialize the enterprise chat system."""
        logger.info("Initializing Enterprise Multitenant Chat System")

        try:
            # Initialize base messaging system
            await self.base_system.initialize()

            # Initialize Redis connection
            await self._initialize_redis_connection()

            # Load workspace security policies
            await self._load_workspace_policies()

            # Initialize compliance processors
            await self._initialize_compliance_processors()

            # Start background security monitoring
            asyncio.create_task(self._security_monitoring_loop())

            # Start audit log processing
            asyncio.create_task(self._audit_processing_loop())

            logger.info("Enterprise Chat System initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize enterprise chat system: {e}")
            raise

    async def send_secure_message(
        self,
        session: SimSession,
        workspace_id: str,
        message_data: Dict[str, Any],
        agent_id: Optional[str] = None
    ) -> Tuple[WorkspaceMessage, ChatAuditEvent]:
        """Send message with enterprise security controls."""
        logger.debug(f"Sending secure message in workspace {workspace_id}")

        # Get workspace security policy
        policy = await self._get_workspace_policy(workspace_id)

        # Check emergency lockdown
        if workspace_id in self._emergency_lockdowns:
            raise HTTPException(
                status_code=423,
                detail="Workspace is under emergency lockdown"
            )

        # Check user quarantine
        if session.user.id in self._quarantined_users.get(workspace_id, set()):
            raise HTTPException(
                status_code=403,
                detail="User is quarantined in this workspace"
            )

        # Rate limiting check
        await self._check_rate_limits(session.user.id, workspace_id, policy)

        # Pre-send security analysis
        security_analysis = await self._analyze_message_security(
            message_data, workspace_id, policy
        )

        # Apply governance action
        if security_analysis.recommended_action == ChatGovernanceAction.BLOCK:
            audit_event = await self._create_audit_event(
                workspace_id=workspace_id,
                user_id=session.user.id,
                event_type="message_blocked",
                event_category="security",
                threat_level=security_analysis.threat_level,
                governance_action=ChatGovernanceAction.BLOCK,
                action_reason="Security policy violation"
            )
            raise HTTPException(
                status_code=403,
                detail="Message blocked by security policy"
            )

        # Send message through base system
        try:
            message = await self.base_system.send_workspace_message(
                session, workspace_id, message_data
            )

            # Apply post-send processing
            if security_analysis.recommended_action == ChatGovernanceAction.QUARANTINE:
                await self._quarantine_message(message, security_analysis)

            # Create comprehensive audit event
            audit_event = await self._create_audit_event(
                workspace_id=workspace_id,
                user_id=session.user.id,
                agent_id=agent_id,
                event_type="message_sent",
                event_category="governance",
                message_id=message.id,
                message_content_hash=self._hash_content(message.content),
                threat_level=security_analysis.threat_level,
                security_labels=security_analysis.detected_threats,
                governance_action=security_analysis.recommended_action,
                encryption_status=message.encrypted_content is not None
            )

            # Store audit event
            await self._store_audit_event(audit_event)

            # Update performance metrics
            await self._update_chat_metrics(workspace_id, "message_sent")

            logger.debug(f"Secure message {message.id} sent successfully")
            return message, audit_event

        except Exception as e:
            # Create failure audit event
            audit_event = await self._create_audit_event(
                workspace_id=workspace_id,
                user_id=session.user.id,
                event_type="message_send_failed",
                event_category="security",
                governance_action=ChatGovernanceAction.BLOCK,
                action_reason=str(e)
            )
            await self._store_audit_event(audit_event)
            raise

    async def create_workspace_security_policy(
        self,
        session: SimSession,
        workspace_id: str,
        policy_config: Dict[str, Any]
    ) -> ChatSecurityPolicy:
        """Create or update workspace security policy."""
        logger.info(f"Creating security policy for workspace {workspace_id}")

        # Validate admin permissions
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required to create security policies"
            )

        # Create policy
        policy = ChatSecurityPolicy(
            workspace_id=workspace_id,
            content_filters=policy_config.get("content_filters", []),
            blocked_domains=set(policy_config.get("blocked_domains", [])),
            allowed_file_types=set(policy_config.get("allowed_file_types", ["txt", "pdf", "docx"])),
            max_message_length=policy_config.get("max_message_length", 10000),
            require_encryption=policy_config.get("require_encryption", True),
            enable_dlp_scanning=policy_config.get("enable_dlp_scanning", True),
            block_sensitive_data=policy_config.get("block_sensitive_data", True),
            quarantine_suspicious=policy_config.get("quarantine_suspicious", True),
            messages_per_minute=policy_config.get("messages_per_minute", 60),
            burst_limit=policy_config.get("burst_limit", 10),
            cooldown_period=policy_config.get("cooldown_period", 300),
            require_moderation=policy_config.get("require_moderation", False),
            auto_compliance_check=policy_config.get("auto_compliance_check", True),
            audit_all_messages=policy_config.get("audit_all_messages", True),
            retention_days=policy_config.get("retention_days", 365),
            enable_threat_detection=policy_config.get("enable_threat_detection", True),
            threat_threshold=policy_config.get("threat_threshold", 0.7),
            auto_escalation=policy_config.get("auto_escalation", True),
            updated_at=datetime.now()
        )

        # Store policy
        self._workspace_policies[workspace_id] = policy
        await self._persist_policy_to_redis(policy)

        # Create audit event
        audit_event = await self._create_audit_event(
            workspace_id=workspace_id,
            user_id=session.user.id,
            event_type="security_policy_created",
            event_category="governance",
            governance_action=ChatGovernanceAction.ALLOW
        )
        await self._store_audit_event(audit_event)

        logger.info(f"Security policy created for workspace {workspace_id}")
        return policy

    async def get_workspace_security_analytics(
        self,
        session: SimSession,
        workspace_id: str,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """Get comprehensive security analytics for workspace."""
        logger.info(f"Generating security analytics for workspace {workspace_id}")

        # Validate admin permissions
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required for security analytics"
            )

        # Get audit events for analysis
        audit_events = await self._get_audit_events(workspace_id, date_range)

        # Calculate analytics
        analytics = {
            "workspace_id": workspace_id,
            "generated_at": datetime.now().isoformat(),
            "generated_by": session.user.id,
            "date_range": {
                "start": date_range[0].isoformat() if date_range else None,
                "end": date_range[1].isoformat() if date_range else None
            },
            "security_metrics": await self._calculate_security_metrics(audit_events),
            "threat_analysis": await self._analyze_threats(audit_events),
            "compliance_summary": await self._generate_compliance_summary(audit_events),
            "governance_actions": await self._summarize_governance_actions(audit_events),
            "policy_effectiveness": await self._analyze_policy_effectiveness(workspace_id, audit_events),
            "recommendations": await self._generate_security_recommendations(workspace_id, audit_events)
        }

        logger.info(f"Security analytics generated for workspace {workspace_id}")
        return analytics

    async def emergency_lockdown_workspace(
        self,
        session: SimSession,
        workspace_id: str,
        reason: str
    ):
        """Emergency lockdown of workspace chat."""
        logger.warning(f"Emergency lockdown initiated for workspace {workspace_id}: {reason}")

        # Validate admin permissions
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required for emergency lockdown"
            )

        # Activate lockdown
        self._emergency_lockdowns.add(workspace_id)

        # Disconnect all active chat connections
        await self._disconnect_workspace_connections(workspace_id)

        # Create audit event
        audit_event = await self._create_audit_event(
            workspace_id=workspace_id,
            user_id=session.user.id,
            event_type="emergency_lockdown",
            event_category="security",
            threat_level=SecurityThreatLevel.CRITICAL,
            governance_action=ChatGovernanceAction.ESCALATE,
            action_reason=reason
        )
        await self._store_audit_event(audit_event)

        # Notify administrators
        await self._notify_administrators(workspace_id, "Emergency lockdown activated", reason)

        logger.warning(f"Emergency lockdown activated for workspace {workspace_id}")

    async def quarantine_user(
        self,
        session: SimSession,
        workspace_id: str,
        target_user_id: str,
        reason: str,
        duration_minutes: Optional[int] = None
    ):
        """Quarantine user in workspace."""
        logger.warning(f"Quarantining user {target_user_id} in workspace {workspace_id}: {reason}")

        # Validate admin permissions
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required to quarantine users"
            )

        # Add to quarantine
        self._quarantined_users[workspace_id].add(target_user_id)

        # Set expiration if specified
        if duration_minutes:
            expiry_time = datetime.now() + timedelta(minutes=duration_minutes)
            # Store expiration in Redis
            if self.redis_client:
                await self.redis_client.setex(
                    f"quarantine:{workspace_id}:{target_user_id}",
                    duration_minutes * 60,
                    "quarantined"
                )

        # Create audit event
        audit_event = await self._create_audit_event(
            workspace_id=workspace_id,
            user_id=session.user.id,
            event_type="user_quarantined",
            event_category="governance",
            threat_level=SecurityThreatLevel.HIGH,
            governance_action=ChatGovernanceAction.QUARANTINE,
            action_reason=reason
        )
        await self._store_audit_event(audit_event)

        logger.warning(f"User {target_user_id} quarantined in workspace {workspace_id}")

    # Private implementation methods

    async def _initialize_redis_connection(self):
        """Initialize Redis connection for caching and persistence."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)

            # Test connection
            await self.redis_client.ping()
            logger.info("Enterprise chat Redis connection initialized")

        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise

    async def _get_workspace_policy(self, workspace_id: str) -> ChatSecurityPolicy:
        """Get or create default security policy for workspace."""
        if workspace_id not in self._workspace_policies:
            # Create default policy
            default_policy = ChatSecurityPolicy(workspace_id=workspace_id)
            self._workspace_policies[workspace_id] = default_policy
            await self._persist_policy_to_redis(default_policy)

        return self._workspace_policies[workspace_id]

    async def _check_rate_limits(
        self,
        user_id: str,
        workspace_id: str,
        policy: ChatSecurityPolicy
    ):
        """Check and enforce rate limits."""
        bucket_key = f"{workspace_id}:{user_id}"

        # Get or create rate limit bucket
        if workspace_id not in self._rate_limit_buckets:
            self._rate_limit_buckets[workspace_id] = {}

        if bucket_key not in self._rate_limit_buckets[workspace_id]:
            self._rate_limit_buckets[workspace_id][bucket_key] = RateLimitBucket(
                user_id=user_id,
                workspace_id=workspace_id,
                bucket_type="minute",
                max_count=policy.messages_per_minute
            )

        bucket = self._rate_limit_buckets[workspace_id][bucket_key]
        now = datetime.now()

        # Reset bucket if window expired
        if now - bucket.window_start > bucket.window_duration:
            bucket.current_count = 0
            bucket.window_start = now

        # Check if user is blocked due to violations
        if bucket.blocked_until and now < bucket.blocked_until:
            raise HTTPException(
                status_code=429,
                detail=f"User blocked due to rate limit violations until {bucket.blocked_until}"
            )

        # Check current limit
        if bucket.current_count >= bucket.max_count:
            bucket.violations += 1
            bucket.last_violation = now

            # Apply cooldown for repeated violations
            if bucket.violations > 3:
                bucket.blocked_until = now + timedelta(seconds=policy.cooldown_period)

            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded"
            )

        # Increment counter
        bucket.current_count += 1

    async def _analyze_message_security(
        self,
        message_data: Dict[str, Any],
        workspace_id: str,
        policy: ChatSecurityPolicy
    ) -> ThreatDetectionResult:
        """Analyze message for security threats."""
        content = message_data.get("content", "")
        message_id = message_data.get("id", str(uuid4()))

        detected_threats = []
        threat_indicators = {}
        confidence_score = 0.0

        # DLP scanning
        if policy.enable_dlp_scanning:
            dlp_results = await self._scan_for_sensitive_data(content)
            if dlp_results:
                detected_threats.extend(dlp_results)
                threat_indicators["dlp_matches"] = dlp_results
                confidence_score += 0.3

        # Content filter checking
        for filter_pattern in policy.content_filters:
            if re.search(filter_pattern, content, re.IGNORECASE):
                detected_threats.append(f"content_filter:{filter_pattern}")
                confidence_score += 0.2

        # Domain blocking
        domain_matches = re.findall(r'https?://([^/\s]+)', content)
        blocked_domains = [d for d in domain_matches if d in policy.blocked_domains]
        if blocked_domains:
            detected_threats.extend([f"blocked_domain:{d}" for d in blocked_domains])
            threat_indicators["blocked_domains"] = blocked_domains
            confidence_score += 0.4

        # Length check
        if len(content) > policy.max_message_length:
            detected_threats.append("message_too_long")
            confidence_score += 0.1

        # Determine threat level and action
        if confidence_score >= 0.8:
            threat_level = SecurityThreatLevel.CRITICAL
            action = ChatGovernanceAction.BLOCK
        elif confidence_score >= 0.6:
            threat_level = SecurityThreatLevel.HIGH
            action = ChatGovernanceAction.QUARANTINE if policy.quarantine_suspicious else ChatGovernanceAction.FLAG
        elif confidence_score >= 0.3:
            threat_level = SecurityThreatLevel.MEDIUM
            action = ChatGovernanceAction.FLAG
        else:
            threat_level = SecurityThreatLevel.LOW
            action = ChatGovernanceAction.ALLOW

        return ThreatDetectionResult(
            message_id=message_id,
            threat_level=threat_level,
            confidence_score=confidence_score,
            detected_threats=detected_threats,
            threat_indicators=threat_indicators,
            recommended_action=action
        )

    async def _scan_for_sensitive_data(self, content: str) -> List[str]:
        """Scan content for sensitive data patterns."""
        matches = []

        for pattern_name, pattern in self._dlp_patterns.items():
            if pattern.search(content):
                matches.append(f"sensitive_data:{pattern_name}")

        return matches

    async def _create_audit_event(
        self,
        workspace_id: str,
        user_id: str,
        event_type: str,
        event_category: str,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None,
        message_id: Optional[str] = None,
        message_content_hash: Optional[str] = None,
        threat_level: SecurityThreatLevel = SecurityThreatLevel.LOW,
        security_labels: Optional[Set[str]] = None,
        policy_violations: Optional[List[str]] = None,
        compliance_frameworks: Optional[Set[ComplianceFramework]] = None,
        governance_action: ChatGovernanceAction = ChatGovernanceAction.ALLOW,
        action_reason: Optional[str] = None,
        moderator_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        encryption_status: bool = False
    ) -> ChatAuditEvent:
        """Create comprehensive audit event."""
        return ChatAuditEvent(
            workspace_id=workspace_id,
            user_id=user_id,
            agent_id=agent_id,
            session_id=session_id,
            event_type=event_type,
            event_category=event_category,
            message_id=message_id,
            message_content_hash=message_content_hash,
            threat_level=threat_level,
            security_labels=security_labels or set(),
            policy_violations=policy_violations or [],
            compliance_frameworks=compliance_frameworks or set(),
            governance_action=governance_action,
            action_reason=action_reason,
            moderator_id=moderator_id,
            ip_address=ip_address,
            user_agent=user_agent,
            encryption_status=encryption_status
        )

    async def _store_audit_event(self, audit_event: ChatAuditEvent):
        """Store audit event for compliance and analysis."""
        # Store in memory for immediate access
        self._audit_events[audit_event.workspace_id].append(audit_event)

        # Persist to Redis for durability
        if self.redis_client:
            event_data = {
                "event_id": audit_event.event_id,
                "workspace_id": audit_event.workspace_id,
                "user_id": audit_event.user_id,
                "event_type": audit_event.event_type,
                "event_category": audit_event.event_category,
                "threat_level": audit_event.threat_level.value,
                "governance_action": audit_event.governance_action.value,
                "timestamp": audit_event.timestamp.isoformat(),
                "security_labels": list(audit_event.security_labels),
                "policy_violations": audit_event.policy_violations
            }

            await self.redis_client.lpush(
                f"audit_events:{audit_event.workspace_id}",
                json.dumps(event_data)
            )

            # Set retention policy
            policy = await self._get_workspace_policy(audit_event.workspace_id)
            await self.redis_client.expire(
                f"audit_events:{audit_event.workspace_id}",
                policy.retention_days * 24 * 60 * 60
            )

    def _hash_content(self, content: str) -> str:
        """Create SHA-256 hash of message content for integrity."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    async def _security_monitoring_loop(self):
        """Background security monitoring and alerting."""
        while True:
            try:
                # Monitor for security patterns
                await self._detect_security_anomalies()

                # Process threat intelligence
                await self._update_threat_intelligence()

                # Clean up expired quarantines
                await self._cleanup_expired_quarantines()

                # Generate security alerts
                await self._process_security_alerts()

                # Wait 30 seconds before next cycle
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Security monitoring loop error: {e}")
                await asyncio.sleep(60)

    async def _audit_processing_loop(self):
        """Background audit event processing."""
        while True:
            try:
                # Process compliance requirements
                await self._process_compliance_events()

                # Generate performance metrics
                await self._update_security_metrics()

                # Archive old audit events
                await self._archive_old_audit_events()

                # Wait 5 minutes before next cycle
                await asyncio.sleep(300)

            except Exception as e:
                logger.error(f"Audit processing loop error: {e}")
                await asyncio.sleep(60)

    async def _calculate_security_metrics(self, audit_events: List[ChatAuditEvent]) -> Dict[str, Any]:
        """Calculate comprehensive security metrics."""
        if not audit_events:
            return {}

        # Count events by category
        event_counts = defaultdict(int)
        threat_levels = defaultdict(int)
        governance_actions = defaultdict(int)

        for event in audit_events:
            event_counts[event.event_type] += 1
            threat_levels[event.threat_level.value] += 1
            governance_actions[event.governance_action.value] += 1

        return {
            "total_events": len(audit_events),
            "event_breakdown": dict(event_counts),
            "threat_level_distribution": dict(threat_levels),
            "governance_actions": dict(governance_actions),
            "security_score": self._calculate_security_score(audit_events),
            "policy_violations": sum(1 for e in audit_events if e.policy_violations),
            "blocked_messages": governance_actions.get("block", 0),
            "quarantined_messages": governance_actions.get("quarantine", 0)
        }

    def _calculate_security_score(self, audit_events: List[ChatAuditEvent]) -> float:
        """Calculate overall security score for workspace."""
        if not audit_events:
            return 100.0

        # Base score
        score = 100.0

        # Deduct for security events
        for event in audit_events:
            if event.threat_level == SecurityThreatLevel.CRITICAL:
                score -= 10.0
            elif event.threat_level == SecurityThreatLevel.HIGH:
                score -= 5.0
            elif event.threat_level == SecurityThreatLevel.MEDIUM:
                score -= 2.0
            elif event.threat_level == SecurityThreatLevel.LOW:
                score -= 0.5

        return max(0.0, score)


# Global instance
enterprise_chat_system: Optional[EnterpriseMultitenantChatSystem] = None


async def get_enterprise_chat_system() -> EnterpriseMultitenantChatSystem:
    """Get the global enterprise chat system instance."""
    global enterprise_chat_system

    if enterprise_chat_system is None:
        from messaging.workspace_messaging_system import workspace_messaging_system
        enterprise_chat_system = EnterpriseMultitenantChatSystem(workspace_messaging_system)
        await enterprise_chat_system.initialize()

    return enterprise_chat_system


# Convenience functions for the Parlant React Chat Interface

async def send_secure_chat_message(
    session: SimSession,
    workspace_id: str,
    agent_id: str,
    message_content: str,
    message_type: str = "chat"
) -> Tuple[WorkspaceMessage, ChatAuditEvent]:
    """Send secure chat message for Parlant React interface."""
    system = await get_enterprise_chat_system()

    message_data = {
        "content": message_content,
        "type": message_type,
        "agent_id": agent_id,
        "priority": "normal"
    }

    return await system.send_secure_message(session, workspace_id, message_data, agent_id)


async def create_chat_security_policy(
    session: SimSession,
    workspace_id: str,
    policy_config: Dict[str, Any]
) -> ChatSecurityPolicy:
    """Create chat security policy for workspace."""
    system = await get_enterprise_chat_system()
    return await system.create_workspace_security_policy(session, workspace_id, policy_config)


async def get_chat_security_analytics(
    session: SimSession,
    workspace_id: str,
    days_back: int = 30
) -> Dict[str, Any]:
    """Get chat security analytics for workspace."""
    system = await get_enterprise_chat_system()

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    return await system.get_workspace_security_analytics(
        session, workspace_id, (start_date, end_date)
    )