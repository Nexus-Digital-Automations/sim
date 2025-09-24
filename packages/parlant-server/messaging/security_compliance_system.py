"""
Messaging Security and Compliance System
========================================

This module implements comprehensive security controls and compliance features
for workspace messaging, including encryption, audit logging, data retention,
and regulatory compliance (GDPR, HIPAA, SOX, etc.).
"""

import asyncio
import logging
import json
import hashlib
import hmac
from typing import Dict, List, Optional, Set, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4
import re
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import base64

import redis.asyncio as redis
from sqlalchemy import select, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from database.connection import get_async_session_context
from auth.sim_auth_bridge import SimSession
from workspace_isolation import WorkspaceContext
from config.settings import get_settings

logger = logging.getLogger(__name__)


class SecurityLevel(str, Enum):
    """Security levels for message classification."""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    TOP_SECRET = "top_secret"


class ComplianceFramework(str, Enum):
    """Supported compliance frameworks."""
    GDPR = "gdpr"
    HIPAA = "hipaa"
    SOX = "sox"
    PCI_DSS = "pci_dss"
    ISO_27001 = "iso_27001"
    NIST = "nist"


class DataRetentionPolicy(str, Enum):
    """Data retention policies."""
    MINIMAL = "minimal"  # 30 days
    STANDARD = "standard"  # 1 year
    EXTENDED = "extended"  # 7 years
    PERMANENT = "permanent"  # No automatic deletion
    CUSTOM = "custom"  # Custom period


class EncryptionMethod(str, Enum):
    """Encryption methods for message content."""
    NONE = "none"
    AES_256_GCM = "aes_256_gcm"
    FERNET = "fernet"
    RSA_OAEP = "rsa_oaep"
    END_TO_END = "end_to_end"


@dataclass
class SecurityPolicy:
    """Comprehensive security policy for workspace messaging."""
    workspace_id: str

    # Encryption settings
    encryption_method: EncryptionMethod = EncryptionMethod.AES_256_GCM
    encryption_required: bool = True
    key_rotation_days: int = 90

    # Content filtering
    content_scanning_enabled: bool = True
    malware_scanning_enabled: bool = True
    pii_detection_enabled: bool = True
    profanity_filtering_enabled: bool = False

    # Access controls
    max_message_size: int = 10000  # bytes
    allowed_file_types: Set[str] = field(default_factory=lambda: {
        'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3'
    })
    max_file_size: int = 100 * 1024 * 1024  # 100MB

    # Rate limiting
    rate_limit_messages_per_minute: int = 100
    rate_limit_files_per_hour: int = 50

    # IP and device restrictions
    allowed_ip_ranges: List[str] = field(default_factory=list)
    blocked_ip_ranges: List[str] = field(default_factory=list)
    device_restrictions: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComplianceSettings:
    """Compliance configuration for workspace messaging."""
    workspace_id: str

    # Framework compliance
    frameworks: Set[ComplianceFramework] = field(default_factory=set)

    # Data retention
    retention_policy: DataRetentionPolicy = DataRetentionPolicy.STANDARD
    custom_retention_days: Optional[int] = None
    legal_hold_enabled: bool = False

    # Data residency
    data_residency_region: Optional[str] = None
    cross_border_transfer_allowed: bool = True

    # Audit requirements
    audit_all_activities: bool = True
    audit_retention_years: int = 7
    real_time_monitoring: bool = True

    # Privacy controls
    right_to_be_forgotten: bool = True
    data_export_enabled: bool = True
    consent_management: bool = True

    # Reporting
    compliance_reporting_enabled: bool = True
    incident_reporting_enabled: bool = True


class MessageSecurityScanner:
    """
    Advanced security scanner for message content and attachments.
    """

    def __init__(self):
        self.settings = get_settings()

        # Security patterns
        self.malicious_patterns = [
            r'<script.*?>.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'data:image/svg\+xml',
            r'onload\s*=',
            r'onerror\s*=',
            r'eval\s*\(',
        ]

        # PII patterns
        self.pii_patterns = {
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
            'credit_card': r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
            'ip_address': r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        }

        # Profanity list (basic example)
        self.profanity_words = {'badword1', 'badword2'}  # Would be loaded from external source

    async def scan_message_content(
        self,
        content: str,
        workspace_id: str,
        policy: SecurityPolicy
    ) -> Dict[str, Any]:
        """
        Comprehensive security scan of message content.
        """
        scan_result = {
            'is_safe': True,
            'threats_detected': [],
            'pii_detected': [],
            'profanity_detected': [],
            'security_score': 100,
            'recommendations': []
        }

        try:
            # Malicious content detection
            if policy.content_scanning_enabled:
                threats = await self._scan_malicious_content(content)
                if threats:
                    scan_result['threats_detected'] = threats
                    scan_result['is_safe'] = False
                    scan_result['security_score'] -= 30

            # PII detection
            if policy.pii_detection_enabled:
                pii_found = await self._detect_pii(content)
                if pii_found:
                    scan_result['pii_detected'] = pii_found
                    scan_result['security_score'] -= 20

            # Profanity filtering
            if policy.profanity_filtering_enabled:
                profanity = await self._detect_profanity(content)
                if profanity:
                    scan_result['profanity_detected'] = profanity
                    scan_result['security_score'] -= 10

            # Content size validation
            if len(content) > policy.max_message_size:
                scan_result['is_safe'] = False
                scan_result['threats_detected'].append({
                    'type': 'size_violation',
                    'description': f'Message exceeds size limit of {policy.max_message_size} bytes'
                })

            # Generate recommendations
            scan_result['recommendations'] = await self._generate_security_recommendations(
                scan_result, policy
            )

            logger.debug(f"Message security scan completed for workspace {workspace_id}")
            return scan_result

        except Exception as e:
            logger.error(f"Security scan failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': [{'type': 'scan_error', 'description': str(e)}],
                'pii_detected': [],
                'profanity_detected': [],
                'security_score': 0,
                'recommendations': ['Manual review required']
            }

    async def scan_file_attachment(
        self,
        file_data: bytes,
        filename: str,
        mime_type: str,
        policy: SecurityPolicy
    ) -> Dict[str, Any]:
        """
        Security scan for file attachments.
        """
        scan_result = {
            'is_safe': True,
            'threats_detected': [],
            'file_hash': '',
            'security_score': 100,
            'quarantine_required': False
        }

        try:
            # Calculate file hash
            scan_result['file_hash'] = hashlib.sha256(file_data).hexdigest()

            # File type validation
            file_extension = filename.split('.')[-1].lower()
            if file_extension not in policy.allowed_file_types:
                scan_result['is_safe'] = False
                scan_result['threats_detected'].append({
                    'type': 'file_type_not_allowed',
                    'description': f'File type .{file_extension} not allowed'
                })

            # File size validation
            if len(file_data) > policy.max_file_size:
                scan_result['is_safe'] = False
                scan_result['threats_detected'].append({
                    'type': 'file_size_exceeded',
                    'description': f'File size {len(file_data)} exceeds limit {policy.max_file_size}'
                })

            # Malware scanning (basic signature detection)
            if policy.malware_scanning_enabled:
                malware_detected = await self._scan_file_malware(file_data, filename)
                if malware_detected:
                    scan_result['is_safe'] = False
                    scan_result['quarantine_required'] = True
                    scan_result['threats_detected'].append({
                        'type': 'malware_detected',
                        'description': 'Potential malware signature detected'
                    })

            return scan_result

        except Exception as e:
            logger.error(f"File security scan failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': [{'type': 'scan_error', 'description': str(e)}],
                'file_hash': '',
                'security_score': 0,
                'quarantine_required': True
            }

    async def _scan_malicious_content(self, content: str) -> List[Dict[str, Any]]:
        """Scan for malicious content patterns."""
        threats = []
        content_lower = content.lower()

        for pattern in self.malicious_patterns:
            matches = re.finditer(pattern, content_lower, re.IGNORECASE | re.DOTALL)
            for match in matches:
                threats.append({
                    'type': 'malicious_code',
                    'pattern': pattern,
                    'match': match.group(),
                    'position': match.start()
                })

        return threats

    async def _detect_pii(self, content: str) -> List[Dict[str, Any]]:
        """Detect personally identifiable information."""
        pii_found = []

        for pii_type, pattern in self.pii_patterns.items():
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                pii_found.append({
                    'type': pii_type,
                    'value': match.group(),
                    'position': match.start(),
                    'masked_value': self._mask_pii_value(match.group(), pii_type)
                })

        return pii_found

    async def _detect_profanity(self, content: str) -> List[str]:
        """Detect profanity in content."""
        words = content.lower().split()
        return [word for word in words if word in self.profanity_words]

    async def _scan_file_malware(self, file_data: bytes, filename: str) -> bool:
        """Basic malware scanning for file attachments."""
        # This is a simplified example. In production, integrate with proper antivirus

        # Check for suspicious file headers
        suspicious_headers = [
            b'MZ',  # PE executable
            b'\x7fELF',  # ELF executable
            b'PK\x03\x04',  # ZIP (could contain malware)
        ]

        # Check if file starts with suspicious patterns
        for header in suspicious_headers:
            if file_data.startswith(header):
                # Additional checks would be performed here
                if filename.endswith(('.exe', '.bat', '.cmd', '.scr')):
                    return True

        return False

    def _mask_pii_value(self, value: str, pii_type: str) -> str:
        """Mask PII values for logging/audit purposes."""
        if pii_type == 'ssn':
            return f"***-**-{value[-4:]}"
        elif pii_type == 'credit_card':
            return f"****-****-****-{value[-4:]}"
        elif pii_type == 'email':
            local, domain = value.split('@')
            return f"{local[:2]}***@{domain}"
        else:
            return f"{value[:2]}***"

    async def _generate_security_recommendations(
        self,
        scan_result: Dict[str, Any],
        policy: SecurityPolicy
    ) -> List[str]:
        """Generate security recommendations based on scan results."""
        recommendations = []

        if scan_result['threats_detected']:
            recommendations.append("Review and sanitize message content")

        if scan_result['pii_detected']:
            recommendations.append("Consider encrypting message due to PII content")

        if scan_result['security_score'] < 70:
            recommendations.append("Message requires manual security review")

        if not policy.encryption_required and scan_result['pii_detected']:
            recommendations.append("Enable encryption for workspace")

        return recommendations


class MessageEncryptionManager:
    """
    Enterprise-grade message encryption and key management.
    """

    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None
        self._workspace_keys: Dict[str, bytes] = {}

    async def initialize(self):
        """Initialize encryption manager."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=False)
            await self.redis_client.ping()
            logger.info("Encryption manager initialized")
        except Exception as e:
            logger.error(f"Failed to initialize encryption manager: {e}")
            raise

    async def encrypt_message(
        self,
        content: str,
        workspace_id: str,
        method: EncryptionMethod = EncryptionMethod.AES_256_GCM
    ) -> Dict[str, Any]:
        """
        Encrypt message content using specified method.
        """
        try:
            if method == EncryptionMethod.NONE:
                return {'encrypted_content': content, 'key_id': None}

            # Get or generate encryption key
            key_id = f"workspace_{workspace_id}_{method.value}"
            encryption_key = await self._get_or_generate_key(workspace_id, method)

            if method == EncryptionMethod.FERNET:
                fernet = Fernet(encryption_key)
                encrypted_content = fernet.encrypt(content.encode()).decode()

            elif method == EncryptionMethod.AES_256_GCM:
                encrypted_content = await self._encrypt_aes_gcm(content, encryption_key)

            else:
                raise ValueError(f"Unsupported encryption method: {method}")

            return {
                'encrypted_content': encrypted_content,
                'key_id': key_id,
                'method': method.value
            }

        except Exception as e:
            logger.error(f"Message encryption failed: {e}")
            raise

    async def decrypt_message(
        self,
        encrypted_content: str,
        workspace_id: str,
        key_id: str,
        method: EncryptionMethod
    ) -> str:
        """
        Decrypt message content.
        """
        try:
            if method == EncryptionMethod.NONE:
                return encrypted_content

            encryption_key = await self._get_key(workspace_id, method)
            if not encryption_key:
                raise ValueError(f"Encryption key not found for workspace {workspace_id}")

            if method == EncryptionMethod.FERNET:
                fernet = Fernet(encryption_key)
                decrypted_content = fernet.decrypt(encrypted_content.encode()).decode()

            elif method == EncryptionMethod.AES_256_GCM:
                decrypted_content = await self._decrypt_aes_gcm(encrypted_content, encryption_key)

            else:
                raise ValueError(f"Unsupported decryption method: {method}")

            return decrypted_content

        except Exception as e:
            logger.error(f"Message decryption failed: {e}")
            raise

    async def rotate_workspace_keys(self, workspace_id: str):
        """
        Rotate encryption keys for workspace.
        """
        logger.info(f"Rotating encryption keys for workspace {workspace_id}")

        try:
            # Generate new keys for all supported methods
            for method in [EncryptionMethod.FERNET, EncryptionMethod.AES_256_GCM]:
                await self._generate_new_key(workspace_id, method)

            # Update key rotation timestamp
            await self._update_key_rotation_timestamp(workspace_id)

            logger.info(f"Key rotation completed for workspace {workspace_id}")

        except Exception as e:
            logger.error(f"Key rotation failed for workspace {workspace_id}: {e}")
            raise

    async def _get_or_generate_key(self, workspace_id: str, method: EncryptionMethod) -> bytes:
        """Get existing or generate new encryption key."""
        key = await self._get_key(workspace_id, method)
        if not key:
            key = await self._generate_new_key(workspace_id, method)
        return key

    async def _get_key(self, workspace_id: str, method: EncryptionMethod) -> Optional[bytes]:
        """Retrieve encryption key from storage."""
        cache_key = f"{workspace_id}_{method.value}"

        # Check in-memory cache first
        if cache_key in self._workspace_keys:
            return self._workspace_keys[cache_key]

        # Retrieve from Redis
        if self.redis_client:
            key_data = await self.redis_client.get(f"encryption_key:{workspace_id}:{method.value}")
            if key_data:
                key = base64.b64decode(key_data)
                self._workspace_keys[cache_key] = key
                return key

        return None

    async def _generate_new_key(self, workspace_id: str, method: EncryptionMethod) -> bytes:
        """Generate new encryption key."""
        if method == EncryptionMethod.FERNET:
            key = Fernet.generate_key()
        elif method == EncryptionMethod.AES_256_GCM:
            key = os.urandom(32)  # 256-bit key
        else:
            raise ValueError(f"Cannot generate key for method: {method}")

        # Store in cache
        cache_key = f"{workspace_id}_{method.value}"
        self._workspace_keys[cache_key] = key

        # Store in Redis
        if self.redis_client:
            await self.redis_client.setex(
                f"encryption_key:{workspace_id}:{method.value}",
                86400 * 90,  # 90 days
                base64.b64encode(key)
            )

        return key

    async def _encrypt_aes_gcm(self, content: str, key: bytes) -> str:
        """Encrypt content using AES-256-GCM."""
        import os
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        aesgcm = AESGCM(key)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        ciphertext = aesgcm.encrypt(nonce, content.encode(), None)

        # Combine nonce and ciphertext
        encrypted_data = nonce + ciphertext
        return base64.b64encode(encrypted_data).decode()

    async def _decrypt_aes_gcm(self, encrypted_content: str, key: bytes) -> str:
        """Decrypt content using AES-256-GCM."""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        encrypted_data = base64.b64decode(encrypted_content)
        nonce = encrypted_data[:12]  # First 12 bytes are nonce
        ciphertext = encrypted_data[12:]  # Rest is ciphertext

        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode()

    async def _update_key_rotation_timestamp(self, workspace_id: str):
        """Update key rotation timestamp."""
        if self.redis_client:
            await self.redis_client.set(
                f"key_rotation_timestamp:{workspace_id}",
                datetime.now().isoformat()
            )


class ComplianceAuditLogger:
    """
    Comprehensive audit logging system for compliance requirements.
    """

    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None

    async def initialize(self):
        """Initialize audit logger."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            await self.redis_client.ping()
            logger.info("Compliance audit logger initialized")
        except Exception as e:
            logger.error(f"Failed to initialize audit logger: {e}")
            raise

    async def log_message_event(
        self,
        event_type: str,
        workspace_id: str,
        user_id: str,
        message_data: Dict[str, Any],
        compliance_settings: ComplianceSettings
    ):
        """Log message-related events for compliance audit."""
        audit_entry = {
            'id': str(uuid4()),
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'workspace_id': workspace_id,
            'actor_id': user_id,
            'actor_type': 'user',
            'target_type': 'message',
            'target_id': message_data.get('id'),
            'event_data': {
                'message_type': message_data.get('type'),
                'channel_id': message_data.get('channel_id'),
                'has_attachments': bool(message_data.get('attachments')),
                'is_encrypted': bool(message_data.get('encrypted_content')),
                'security_labels': message_data.get('security_labels', []),
                'compliance_flags': message_data.get('compliance_flags', [])
            },
            'compliance_context': {
                'frameworks': list(compliance_settings.frameworks),
                'retention_policy': compliance_settings.retention_policy.value,
                'data_residency': compliance_settings.data_residency_region
            },
            'severity': self._determine_event_severity(event_type, message_data),
            'retention_until': self._calculate_retention_date(compliance_settings)
        }

        # Store audit entry
        await self._store_audit_entry(audit_entry)

        # Real-time monitoring if enabled
        if compliance_settings.real_time_monitoring:
            await self._trigger_real_time_alert(audit_entry)

    async def log_access_event(
        self,
        event_type: str,
        workspace_id: str,
        user_id: str,
        access_details: Dict[str, Any]
    ):
        """Log access events for compliance audit."""
        audit_entry = {
            'id': str(uuid4()),
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'workspace_id': workspace_id,
            'actor_id': user_id,
            'actor_type': 'user',
            'target_type': 'workspace',
            'target_id': workspace_id,
            'event_data': access_details,
            'severity': 'info'
        }

        await self._store_audit_entry(audit_entry)

    async def log_security_event(
        self,
        event_type: str,
        workspace_id: str,
        security_details: Dict[str, Any],
        severity: str = 'warning'
    ):
        """Log security events for compliance audit."""
        audit_entry = {
            'id': str(uuid4()),
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'workspace_id': workspace_id,
            'actor_id': security_details.get('user_id', 'system'),
            'actor_type': 'system',
            'target_type': 'security',
            'target_id': security_details.get('target_id'),
            'event_data': security_details,
            'severity': severity
        }

        await self._store_audit_entry(audit_entry)

        # Trigger security alerts for high-severity events
        if severity in ['error', 'critical']:
            await self._trigger_security_alert(audit_entry)

    async def generate_compliance_report(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime,
        framework: ComplianceFramework
    ) -> Dict[str, Any]:
        """Generate compliance report for specified period."""
        logger.info(f"Generating {framework.value} compliance report for workspace {workspace_id}")

        try:
            # Query audit logs for the specified period
            audit_entries = await self._query_audit_logs(workspace_id, start_date, end_date)

            # Generate framework-specific report
            if framework == ComplianceFramework.GDPR:
                report = await self._generate_gdpr_report(audit_entries, workspace_id)
            elif framework == ComplianceFramework.HIPAA:
                report = await self._generate_hipaa_report(audit_entries, workspace_id)
            elif framework == ComplianceFramework.SOX:
                report = await self._generate_sox_report(audit_entries, workspace_id)
            else:
                report = await self._generate_generic_report(audit_entries, workspace_id)

            report.update({
                'workspace_id': workspace_id,
                'framework': framework.value,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'generated_at': datetime.now().isoformat(),
                'total_events': len(audit_entries)
            })

            return report

        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            raise

    # Private implementation methods

    def _determine_event_severity(self, event_type: str, message_data: Dict[str, Any]) -> str:
        """Determine severity level for audit event."""
        if 'security' in event_type.lower() or 'violation' in event_type.lower():
            return 'error'
        elif message_data.get('security_labels') or message_data.get('compliance_flags'):
            return 'warning'
        else:
            return 'info'

    def _calculate_retention_date(self, compliance_settings: ComplianceSettings) -> str:
        """Calculate retention date based on compliance settings."""
        retention_days = {
            DataRetentionPolicy.MINIMAL: 30,
            DataRetentionPolicy.STANDARD: 365,
            DataRetentionPolicy.EXTENDED: 365 * 7,
            DataRetentionPolicy.CUSTOM: compliance_settings.custom_retention_days or 365
        }

        if compliance_settings.retention_policy == DataRetentionPolicy.PERMANENT:
            return None

        days = retention_days[compliance_settings.retention_policy]
        retention_date = datetime.now() + timedelta(days=days)
        return retention_date.isoformat()

    async def _store_audit_entry(self, audit_entry: Dict[str, Any]):
        """Store audit entry in persistent storage."""
        try:
            # Store in Redis for fast access
            if self.redis_client:
                await self.redis_client.lpush(
                    f"audit_log:{audit_entry['workspace_id']}",
                    json.dumps(audit_entry)
                )

                # Set expiration based on retention policy
                retention_days = 365 * 7  # Default 7 years
                await self.redis_client.expire(
                    f"audit_log:{audit_entry['workspace_id']}",
                    retention_days * 24 * 60 * 60
                )

            # Also store in database for long-term persistence
            async with get_async_session_context() as db_session:
                # Implementation would store in MessagingAuditLog table
                pass

        except Exception as e:
            logger.error(f"Failed to store audit entry: {e}")

    async def _trigger_real_time_alert(self, audit_entry: Dict[str, Any]):
        """Trigger real-time monitoring alert."""
        if audit_entry['severity'] in ['warning', 'error', 'critical']:
            # Implementation would send alerts to monitoring systems
            logger.warning(f"Real-time audit alert: {audit_entry['event_type']}")

    async def _trigger_security_alert(self, audit_entry: Dict[str, Any]):
        """Trigger security alert for high-severity events."""
        logger.critical(f"Security alert triggered: {audit_entry['event_type']}")
        # Implementation would integrate with security incident management systems

    async def _query_audit_logs(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Query audit logs for specified period."""
        # Implementation would query from database and Redis
        return []

    async def _generate_gdpr_report(
        self,
        audit_entries: List[Dict[str, Any]],
        workspace_id: str
    ) -> Dict[str, Any]:
        """Generate GDPR-specific compliance report."""
        return {
            'data_processing_activities': [],
            'consent_management': {},
            'data_subject_rights': {},
            'privacy_impact_assessment': {},
            'breach_notifications': []
        }

    async def _generate_hipaa_report(
        self,
        audit_entries: List[Dict[str, Any]],
        workspace_id: str
    ) -> Dict[str, Any]:
        """Generate HIPAA-specific compliance report."""
        return {
            'covered_entities': [],
            'business_associates': [],
            'phi_access_logs': [],
            'security_incidents': [],
            'training_records': []
        }

    async def _generate_sox_report(
        self,
        audit_entries: List[Dict[str, Any]],
        workspace_id: str
    ) -> Dict[str, Any]:
        """Generate SOX-specific compliance report."""
        return {
            'internal_controls': {},
            'financial_reporting': {},
            'audit_trail': [],
            'access_controls': {},
            'change_management': []
        }

    async def _generate_generic_report(
        self,
        audit_entries: List[Dict[str, Any]],
        workspace_id: str
    ) -> Dict[str, Any]:
        """Generate generic compliance report."""
        return {
            'activity_summary': {},
            'security_events': [],
            'access_patterns': {},
            'policy_violations': []
        }


# Global instances
message_security_scanner = MessageSecurityScanner()
message_encryption_manager = MessageEncryptionManager()
compliance_audit_logger = ComplianceAuditLogger()


# Convenience functions for integration

async def scan_message_security(
    content: str,
    workspace_id: str,
    policy: SecurityPolicy
) -> Dict[str, Any]:
    """Scan message for security threats."""
    return await message_security_scanner.scan_message_content(content, workspace_id, policy)


async def encrypt_workspace_message(
    content: str,
    workspace_id: str,
    method: EncryptionMethod = EncryptionMethod.AES_256_GCM
) -> Dict[str, Any]:
    """Encrypt message content."""
    return await message_encryption_manager.encrypt_message(content, workspace_id, method)


async def log_compliance_event(
    event_type: str,
    workspace_id: str,
    user_id: str,
    event_data: Dict[str, Any]
):
    """Log event for compliance audit."""
    compliance_settings = ComplianceSettings(workspace_id=workspace_id)  # Would be loaded from DB
    await compliance_audit_logger.log_message_event(
        event_type, workspace_id, user_id, event_data, compliance_settings
    )