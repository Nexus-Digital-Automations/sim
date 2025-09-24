"""
Enterprise Audit and Compliance System for Multitenant Chat
===========================================================

This module implements comprehensive audit logging and compliance tracking
for enterprise multitenant chat messaging with support for multiple
compliance frameworks and regulatory requirements.

Key Features:
- Multi-framework compliance support (SOC 2, GDPR, HIPAA, CCPA, etc.)
- Comprehensive audit event logging and retention
- Real-time compliance monitoring and alerting
- Data sovereignty and cross-border compliance
- Automated compliance reporting and documentation
- Enterprise-grade data lineage and traceability
- Integration with external compliance management systems
"""

import asyncio
import logging
import json
import hashlib
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from uuid import uuid4, UUID
from enum import Enum
from collections import defaultdict, deque
import gzip
import base64
from pathlib import Path

import redis.asyncio as redis
from sqlalchemy import select, and_, or_, func, text, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from pydantic import BaseModel, Field
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from database.connection import get_async_session_context
from config.settings import get_settings
from messaging.enterprise_multitenant_chat_system import (
    ChatAuditEvent,
    SecurityThreatLevel,
    ChatGovernanceAction,
    ComplianceFramework
)

logger = logging.getLogger(__name__)


class DataClassification(str, Enum):
    """Data classification levels for compliance."""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    TOP_SECRET = "top_secret"


class RetentionPolicy(str, Enum):
    """Data retention policies."""
    SHORT_TERM = "short_term"  # 90 days
    STANDARD = "standard"      # 1 year
    EXTENDED = "extended"      # 7 years
    PERMANENT = "permanent"    # Indefinite
    LEGAL_HOLD = "legal_hold"  # Until legal hold lifted


class ComplianceViolationType(str, Enum):
    """Types of compliance violations."""
    DATA_BREACH = "data_breach"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_RETENTION_VIOLATION = "data_retention_violation"
    CROSS_BORDER_VIOLATION = "cross_border_violation"
    CONSENT_VIOLATION = "consent_violation"
    PRIVACY_VIOLATION = "privacy_violation"
    SECURITY_CONTROL_FAILURE = "security_control_failure"
    AUDIT_TRAIL_FAILURE = "audit_trail_failure"


@dataclass
class ComplianceEvent:
    """Comprehensive compliance event record."""
    event_id: str = field(default_factory=lambda: str(uuid4()))
    workspace_id: str = ""
    user_id: str = ""
    agent_id: Optional[str] = None

    # Compliance context
    frameworks: Set[ComplianceFramework] = field(default_factory=set)
    data_classification: DataClassification = DataClassification.INTERNAL
    retention_policy: RetentionPolicy = RetentionPolicy.STANDARD

    # Event details
    event_type: str = ""
    event_description: str = ""
    data_subject: Optional[str] = None  # For GDPR data subject rights
    legal_basis: Optional[str] = None   # GDPR legal basis

    # Violation tracking
    violation_type: Optional[ComplianceViolationType] = None
    violation_severity: str = "low"  # low, medium, high, critical
    remediation_required: bool = False
    remediation_deadline: Optional[datetime] = None

    # Data lineage
    data_source: Optional[str] = None
    data_destination: Optional[str] = None
    data_transformation: Optional[str] = None
    data_hash: Optional[str] = None  # For integrity verification

    # Geographic and jurisdictional
    data_location: Optional[str] = None  # Geographic location of data
    processing_location: Optional[str] = None  # Where processing occurred
    jurisdiction: Optional[str] = None  # Legal jurisdiction

    # Timestamps
    timestamp: datetime = field(default_factory=datetime.now)
    retention_until: Optional[datetime] = None
    archived_at: Optional[datetime] = None

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    encrypted: bool = False
    signed: bool = False
    signature: Optional[str] = None


@dataclass
class ComplianceReport:
    """Compliance report structure."""
    report_id: str = field(default_factory=lambda: str(uuid4()))
    workspace_id: str = ""
    framework: ComplianceFramework = ComplianceFramework.SOC2

    # Report metadata
    report_type: str = "periodic"  # periodic, incident, audit
    generated_by: str = ""
    generated_at: datetime = field(default_factory=datetime.now)
    period_start: datetime = field(default_factory=datetime.now)
    period_end: datetime = field(default_factory=datetime.now)

    # Compliance metrics
    total_events: int = 0
    violations_count: int = 0
    violation_breakdown: Dict[str, int] = field(default_factory=dict)
    compliance_score: float = 100.0

    # Controls assessment
    security_controls: Dict[str, str] = field(default_factory=dict)  # control_id -> status
    policy_compliance: Dict[str, str] = field(default_factory=dict)  # policy_id -> status
    risk_assessment: Dict[str, Any] = field(default_factory=dict)

    # Recommendations
    findings: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    action_items: List[Dict[str, Any]] = field(default_factory=list)


class EnterpriseAuditSystem:
    """
    Enterprise-grade audit and compliance system for multitenant chat.

    Provides comprehensive compliance tracking, audit logging, and
    regulatory reporting capabilities.
    """

    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None
        self.async_engine = None

        # In-memory storage for hot data
        self._compliance_events: Dict[str, deque] = defaultdict(lambda: deque(maxlen=50000))
        self._violation_cache: Dict[str, List[ComplianceEvent]] = defaultdict(list)

        # Compliance framework processors
        self._framework_processors: Dict[ComplianceFramework, callable] = {}

        # Data classification rules
        self._classification_rules: Dict[str, DataClassification] = {}

        # Retention policies by classification
        self._retention_policies: Dict[DataClassification, RetentionPolicy] = {
            DataClassification.PUBLIC: RetentionPolicy.STANDARD,
            DataClassification.INTERNAL: RetentionPolicy.STANDARD,
            DataClassification.CONFIDENTIAL: RetentionPolicy.EXTENDED,
            DataClassification.RESTRICTED: RetentionPolicy.EXTENDED,
            DataClassification.TOP_SECRET: RetentionPolicy.PERMANENT
        }

        # Geographic compliance mapping
        self._geographic_rules: Dict[str, Dict[str, Any]] = {}

        # Encryption for sensitive audit data
        self._audit_encryption_key: Optional[bytes] = None

    async def initialize(self):
        """Initialize the enterprise audit system."""
        logger.info("Initializing Enterprise Audit and Compliance System")

        try:
            # Initialize Redis connection
            await self._initialize_redis_connection()

            # Initialize database connection
            await self._initialize_database_connection()

            # Initialize compliance framework processors
            await self._initialize_compliance_processors()

            # Load data classification rules
            await self._load_classification_rules()

            # Initialize encryption system
            await self._initialize_audit_encryption()

            # Start background compliance monitoring
            asyncio.create_task(self._compliance_monitoring_loop())
            asyncio.create_task(self._retention_management_loop())
            asyncio.create_task(self._violation_processing_loop())

            logger.info("Enterprise Audit System initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize audit system: {e}")
            raise

    async def log_compliance_event(
        self,
        workspace_id: str,
        user_id: str,
        event_type: str,
        event_description: str,
        frameworks: Set[ComplianceFramework],
        data_classification: DataClassification = DataClassification.INTERNAL,
        agent_id: Optional[str] = None,
        data_subject: Optional[str] = None,
        legal_basis: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ComplianceEvent:
        """Log a comprehensive compliance event."""
        logger.debug(f"Logging compliance event: {event_type} for workspace {workspace_id}")

        # Create compliance event
        event = ComplianceEvent(
            workspace_id=workspace_id,
            user_id=user_id,
            agent_id=agent_id,
            frameworks=frameworks,
            data_classification=data_classification,
            retention_policy=self._retention_policies.get(data_classification, RetentionPolicy.STANDARD),
            event_type=event_type,
            event_description=event_description,
            data_subject=data_subject,
            legal_basis=legal_basis,
            metadata=metadata or {}
        )

        # Set retention date
        event.retention_until = self._calculate_retention_date(event.retention_policy)

        # Add data lineage
        await self._add_data_lineage(event)

        # Add geographic compliance data
        await self._add_geographic_compliance(event)

        # Encrypt sensitive data if required
        if data_classification in [DataClassification.CONFIDENTIAL, DataClassification.RESTRICTED, DataClassification.TOP_SECRET]:
            event = await self._encrypt_sensitive_event_data(event)

        # Process framework-specific requirements
        for framework in frameworks:
            await self._process_framework_requirements(event, framework)

        # Check for compliance violations
        violations = await self._check_compliance_violations(event)
        if violations:
            await self._process_compliance_violations(event, violations)

        # Store event
        await self._store_compliance_event(event)

        # Update compliance metrics
        await self._update_compliance_metrics(workspace_id, event)

        logger.debug(f"Compliance event {event.event_id} logged successfully")
        return event

    async def generate_compliance_report(
        self,
        workspace_id: str,
        framework: ComplianceFramework,
        period_start: datetime,
        period_end: datetime,
        report_type: str = "periodic"
    ) -> ComplianceReport:
        """Generate comprehensive compliance report."""
        logger.info(f"Generating {framework.value} compliance report for workspace {workspace_id}")

        # Get compliance events for period
        events = await self._get_compliance_events_for_period(
            workspace_id, period_start, period_end, framework
        )

        # Create report
        report = ComplianceReport(
            workspace_id=workspace_id,
            framework=framework,
            report_type=report_type,
            generated_by="system",
            period_start=period_start,
            period_end=period_end,
            total_events=len(events)
        )

        # Analyze violations
        violations = [e for e in events if e.violation_type is not None]
        report.violations_count = len(violations)

        # Breakdown violations by type
        violation_breakdown = defaultdict(int)
        for violation in violations:
            violation_breakdown[violation.violation_type.value] += 1
        report.violation_breakdown = dict(violation_breakdown)

        # Calculate compliance score
        report.compliance_score = self._calculate_compliance_score(events, violations)

        # Assess security controls
        report.security_controls = await self._assess_security_controls(workspace_id, framework)

        # Check policy compliance
        report.policy_compliance = await self._assess_policy_compliance(workspace_id, framework)

        # Perform risk assessment
        report.risk_assessment = await self._perform_risk_assessment(workspace_id, events, violations)

        # Generate findings and recommendations
        report.findings = await self._generate_compliance_findings(events, violations, framework)
        report.recommendations = await self._generate_compliance_recommendations(report.findings, framework)
        report.action_items = await self._generate_action_items(report.recommendations)

        # Store report
        await self._store_compliance_report(report)

        logger.info(f"Compliance report {report.report_id} generated successfully")
        return report

    async def handle_data_subject_request(
        self,
        workspace_id: str,
        data_subject_id: str,
        request_type: str,  # access, rectification, erasure, portability, restriction
        legal_basis: Optional[str] = None
    ) -> Dict[str, Any]:
        """Handle GDPR data subject rights requests."""
        logger.info(f"Processing data subject request: {request_type} for {data_subject_id}")

        # Log the request
        await self.log_compliance_event(
            workspace_id=workspace_id,
            user_id="system",
            event_type="data_subject_request",
            event_description=f"Data subject {request_type} request received",
            frameworks={ComplianceFramework.GDPR},
            data_classification=DataClassification.RESTRICTED,
            data_subject=data_subject_id,
            legal_basis=legal_basis
        )

        if request_type == "access":
            return await self._handle_data_access_request(workspace_id, data_subject_id)
        elif request_type == "rectification":
            return await self._handle_data_rectification_request(workspace_id, data_subject_id)
        elif request_type == "erasure":
            return await self._handle_data_erasure_request(workspace_id, data_subject_id)
        elif request_type == "portability":
            return await self._handle_data_portability_request(workspace_id, data_subject_id)
        elif request_type == "restriction":
            return await self._handle_data_restriction_request(workspace_id, data_subject_id)
        else:
            raise ValueError(f"Unsupported data subject request type: {request_type}")

    async def audit_data_lineage(
        self,
        workspace_id: str,
        data_identifier: str,
        trace_depth: int = 10
    ) -> Dict[str, Any]:
        """Audit complete data lineage for compliance verification."""
        logger.info(f"Auditing data lineage for {data_identifier} in workspace {workspace_id}")

        # Get all events related to this data
        lineage_events = await self._get_data_lineage_events(workspace_id, data_identifier)

        # Build lineage tree
        lineage_tree = await self._build_lineage_tree(lineage_events, trace_depth)

        # Verify data integrity
        integrity_status = await self._verify_data_integrity(lineage_events)

        # Check compliance at each step
        compliance_status = await self._verify_lineage_compliance(lineage_events)

        return {
            "workspace_id": workspace_id,
            "data_identifier": data_identifier,
            "lineage_tree": lineage_tree,
            "integrity_status": integrity_status,
            "compliance_status": compliance_status,
            "total_events": len(lineage_events),
            "audit_timestamp": datetime.now().isoformat()
        }

    # Private implementation methods

    async def _initialize_redis_connection(self):
        """Initialize Redis connection for audit data caching."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)

            # Test connection
            await self.redis_client.ping()
            logger.info("Audit system Redis connection initialized")

        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise

    async def _initialize_database_connection(self):
        """Initialize dedicated database connection for audit data."""
        try:
            # Create separate engine for audit data (could be different database)
            audit_db_url = self.settings.audit_database_url or self.settings.database_url

            self.async_engine = create_async_engine(
                audit_db_url,
                pool_size=20,
                max_overflow=30,
                pool_timeout=30,
                pool_recycle=3600
            )

            # Test connection
            async with self.async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

            logger.info("Audit system database connection initialized")

        except Exception as e:
            logger.error(f"Failed to initialize audit database connection: {e}")
            raise

    async def _initialize_compliance_processors(self):
        """Initialize compliance framework-specific processors."""
        # SOC 2 processor
        self._framework_processors[ComplianceFramework.SOC2] = self._process_soc2_requirements

        # GDPR processor
        self._framework_processors[ComplianceFramework.GDPR] = self._process_gdpr_requirements

        # HIPAA processor
        self._framework_processors[ComplianceFramework.HIPAA] = self._process_hipaa_requirements

        # CCPA processor
        self._framework_processors[ComplianceFramework.CCPA] = self._process_ccpa_requirements

        # FERPA processor
        self._framework_processors[ComplianceFramework.FERPA] = self._process_ferpa_requirements

        # PCI DSS processor
        self._framework_processors[ComplianceFramework.PCI_DSS] = self._process_pci_dss_requirements

        logger.info("Compliance framework processors initialized")

    async def _load_classification_rules(self):
        """Load data classification rules."""
        # Default classification rules
        self._classification_rules = {
            "password": DataClassification.TOP_SECRET,
            "ssn": DataClassification.RESTRICTED,
            "credit_card": DataClassification.RESTRICTED,
            "email": DataClassification.CONFIDENTIAL,
            "phone": DataClassification.CONFIDENTIAL,
            "api_key": DataClassification.RESTRICTED,
            "token": DataClassification.RESTRICTED,
            "secret": DataClassification.RESTRICTED
        }

    async def _initialize_audit_encryption(self):
        """Initialize encryption system for sensitive audit data."""
        # Generate or load encryption key for audit data
        # In production, this would come from a secure key management service
        key = Fernet.generate_key()
        self._audit_encryption_key = key
        logger.info("Audit encryption system initialized")

    def _calculate_retention_date(self, retention_policy: RetentionPolicy) -> Optional[datetime]:
        """Calculate retention date based on policy."""
        now = datetime.now()

        if retention_policy == RetentionPolicy.SHORT_TERM:
            return now + timedelta(days=90)
        elif retention_policy == RetentionPolicy.STANDARD:
            return now + timedelta(days=365)
        elif retention_policy == RetentionPolicy.EXTENDED:
            return now + timedelta(days=2555)  # 7 years
        elif retention_policy == RetentionPolicy.PERMANENT:
            return None  # Never expires
        elif retention_policy == RetentionPolicy.LEGAL_HOLD:
            return None  # Until hold is lifted

        return now + timedelta(days=365)  # Default to 1 year

    async def _add_data_lineage(self, event: ComplianceEvent):
        """Add data lineage information to compliance event."""
        # Extract data flow information
        if "message_id" in event.metadata:
            event.data_source = f"message:{event.metadata['message_id']}"
            event.data_hash = hashlib.sha256(
                event.event_description.encode('utf-8')
            ).hexdigest()

        if "agent_response" in event.metadata:
            event.data_transformation = "ai_processing"

    async def _add_geographic_compliance(self, event: ComplianceEvent):
        """Add geographic compliance information."""
        # Determine data processing location
        event.processing_location = "us-east-1"  # Default region
        event.jurisdiction = "United States"

        # Check for cross-border data transfer restrictions
        if ComplianceFramework.GDPR in event.frameworks:
            event.jurisdiction = "European Union"

    async def _encrypt_sensitive_event_data(self, event: ComplianceEvent) -> ComplianceEvent:
        """Encrypt sensitive data in compliance event."""
        if not self._audit_encryption_key:
            return event

        fernet = Fernet(self._audit_encryption_key)

        # Encrypt sensitive fields
        if event.data_subject:
            encrypted_data = fernet.encrypt(event.data_subject.encode())
            event.data_subject = base64.b64encode(encrypted_data).decode()
            event.encrypted = True

        return event

    async def _store_compliance_event(self, event: ComplianceEvent):
        """Store compliance event with appropriate persistence."""
        # Store in memory for hot access
        self._compliance_events[event.workspace_id].append(event)

        # Store in Redis for medium-term access
        if self.redis_client:
            event_data = asdict(event)
            # Convert sets to lists for JSON serialization
            event_data['frameworks'] = list(event.frameworks) if event.frameworks else []

            await self.redis_client.lpush(
                f"compliance_events:{event.workspace_id}",
                json.dumps(event_data, default=str)
            )

            # Set expiration based on retention policy
            if event.retention_until:
                ttl = int((event.retention_until - datetime.now()).total_seconds())
                await self.redis_client.expire(
                    f"compliance_events:{event.workspace_id}",
                    ttl
                )

        # Store in database for long-term persistence
        # This would typically use a dedicated audit database
        # Implementation would depend on specific database schema

    async def _process_framework_requirements(
        self,
        event: ComplianceEvent,
        framework: ComplianceFramework
    ):
        """Process framework-specific compliance requirements."""
        processor = self._framework_processors.get(framework)
        if processor:
            await processor(event)

    async def _process_soc2_requirements(self, event: ComplianceEvent):
        """Process SOC 2 compliance requirements."""
        # SOC 2 Type II requires comprehensive logging
        event.metadata["soc2_control"] = "CC6.1"  # Logical access controls
        event.metadata["soc2_principle"] = "Security"

    async def _process_gdpr_requirements(self, event: ComplianceEvent):
        """Process GDPR compliance requirements."""
        # GDPR requires legal basis for processing
        if not event.legal_basis:
            event.legal_basis = "legitimate_interest"

        # Add GDPR-specific metadata
        event.metadata["gdpr_article"] = "Article 6"
        event.metadata["data_controller"] = event.workspace_id

    async def _process_hipaa_requirements(self, event: ComplianceEvent):
        """Process HIPAA compliance requirements."""
        # HIPAA requires additional safeguards
        event.metadata["hipaa_safeguard"] = "administrative"
        event.metadata["minimum_necessary"] = True

    async def _process_ccpa_requirements(self, event: ComplianceEvent):
        """Process CCPA compliance requirements."""
        # CCPA consumer rights tracking
        event.metadata["ccpa_category"] = "personal_information"
        event.metadata["consumer_rights"] = "applicable"

    async def _process_ferpa_requirements(self, event: ComplianceEvent):
        """Process FERPA compliance requirements."""
        # FERPA educational records protection
        event.metadata["ferpa_record_type"] = "educational"
        event.metadata["directory_information"] = False

    async def _process_pci_dss_requirements(self, event: ComplianceEvent):
        """Process PCI DSS compliance requirements."""
        # PCI DSS cardholder data protection
        event.metadata["pci_requirement"] = "10.2"  # Audit trails
        event.metadata["cardholder_data"] = False

    async def _compliance_monitoring_loop(self):
        """Background compliance monitoring and alerting."""
        while True:
            try:
                # Check for compliance violations
                await self._monitor_compliance_violations()

                # Update compliance metrics
                await self._update_global_compliance_metrics()

                # Generate automated reports
                await self._generate_automated_reports()

                # Wait 5 minutes before next cycle
                await asyncio.sleep(300)

            except Exception as e:
                logger.error(f"Compliance monitoring loop error: {e}")
                await asyncio.sleep(60)

    async def _retention_management_loop(self):
        """Background retention policy management."""
        while True:
            try:
                # Archive expired events
                await self._archive_expired_events()

                # Purge events past retention
                await self._purge_expired_events()

                # Update retention statistics
                await self._update_retention_statistics()

                # Wait 1 hour before next cycle
                await asyncio.sleep(3600)

            except Exception as e:
                logger.error(f"Retention management loop error: {e}")
                await asyncio.sleep(300)

    async def _violation_processing_loop(self):
        """Background violation processing and remediation."""
        while True:
            try:
                # Process pending violations
                await self._process_pending_violations()

                # Check remediation deadlines
                await self._check_remediation_deadlines()

                # Generate violation reports
                await self._generate_violation_reports()

                # Wait 15 minutes before next cycle
                await asyncio.sleep(900)

            except Exception as e:
                logger.error(f"Violation processing loop error: {e}")
                await asyncio.sleep(60)

    def _calculate_compliance_score(
        self,
        events: List[ComplianceEvent],
        violations: List[ComplianceEvent]
    ) -> float:
        """Calculate overall compliance score."""
        if not events:
            return 100.0

        # Base score
        score = 100.0

        # Deduct for violations
        for violation in violations:
            if violation.violation_severity == "critical":
                score -= 25.0
            elif violation.violation_severity == "high":
                score -= 10.0
            elif violation.violation_severity == "medium":
                score -= 5.0
            elif violation.violation_severity == "low":
                score -= 1.0

        return max(0.0, score)


# Global instance
enterprise_audit_system: Optional[EnterpriseAuditSystem] = None


async def get_enterprise_audit_system() -> EnterpriseAuditSystem:
    """Get the global enterprise audit system instance."""
    global enterprise_audit_system

    if enterprise_audit_system is None:
        enterprise_audit_system = EnterpriseAuditSystem()
        await enterprise_audit_system.initialize()

    return enterprise_audit_system


# Convenience functions for compliance logging

async def log_chat_compliance_event(
    workspace_id: str,
    user_id: str,
    event_type: str,
    event_description: str,
    frameworks: Set[ComplianceFramework],
    data_classification: DataClassification = DataClassification.INTERNAL,
    **kwargs
) -> ComplianceEvent:
    """Log a chat compliance event."""
    audit_system = await get_enterprise_audit_system()
    return await audit_system.log_compliance_event(
        workspace_id=workspace_id,
        user_id=user_id,
        event_type=event_type,
        event_description=event_description,
        frameworks=frameworks,
        data_classification=data_classification,
        **kwargs
    )


async def generate_workspace_compliance_report(
    workspace_id: str,
    framework: ComplianceFramework,
    days_back: int = 30
) -> ComplianceReport:
    """Generate compliance report for workspace."""
    audit_system = await get_enterprise_audit_system()

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    return await audit_system.generate_compliance_report(
        workspace_id=workspace_id,
        framework=framework,
        period_start=start_date,
        period_end=end_date
    )