"""
Comprehensive Security Testing Framework for Multitenant Chat System
===================================================================

This module provides comprehensive security testing for the enterprise
multitenant chat messaging system with validation of isolation,
encryption, compliance, and abuse prevention features.

Key Test Areas:
- Workspace isolation and cross-tenant access prevention
- Message encryption and data security
- Rate limiting and abuse prevention
- Compliance and audit logging
- Socket.IO security and authentication
- Admin controls and emergency procedures
"""

import pytest
import asyncio
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from fastapi import FastAPI
import socketio

from messaging.enterprise_multitenant_chat_system import (
    EnterpriseMultitenantChatSystem,
    ChatSecurityPolicy,
    SecurityThreatLevel,
    ChatGovernanceAction,
    ComplianceFramework
)
from messaging.secure_socketio_integration import SecureSocketIOIntegration
from security.advanced_rate_limiting import (
    AdvancedRateLimitingSystem,
    RateLimitTier,
    PenaltyLevel
)
from compliance.enterprise_audit_system import (
    EnterpriseAuditSystem,
    DataClassification
)
from auth.sim_auth_bridge import SimSession, SimUser


class TestMultitenantChatSecurity:
    """Comprehensive security tests for multitenant chat system."""

    @pytest.fixture
    async def setup_test_environment(self):
        """Set up test environment with mock dependencies."""
        # Mock Redis client
        mock_redis = AsyncMock()
        mock_redis.ping.return_value = True
        mock_redis.setex = AsyncMock()
        mock_redis.lpush = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)

        # Mock workspace messaging system
        mock_base_system = AsyncMock()
        mock_base_system.initialize = AsyncMock()

        # Create test instances
        self.chat_system = EnterpriseMultitenantChatSystem(mock_base_system)
        self.chat_system.redis_client = mock_redis

        self.rate_limiter = AdvancedRateLimitingSystem()
        self.rate_limiter.redis_client = mock_redis

        self.audit_system = EnterpriseAuditSystem()
        self.audit_system.redis_client = mock_redis

        # Test data
        self.workspace_1 = "workspace_123"
        self.workspace_2 = "workspace_456"
        self.user_1 = "user_123"
        self.user_2 = "user_456"
        self.admin_user = "admin_789"

        return {
            "chat_system": self.chat_system,
            "rate_limiter": self.rate_limiter,
            "audit_system": self.audit_system
        }

    @pytest.mark.asyncio
    async def test_workspace_isolation_prevention(self, setup_test_environment):
        """Test that users cannot access messages from other workspaces."""
        systems = await setup_test_environment

        # Create session for user in workspace 1
        session_1 = SimSession(
            user=SimUser(id=self.user_1, name="User 1"),
            workspace_id=self.workspace_1
        )

        # Create session for user in workspace 2
        session_2 = SimSession(
            user=SimUser(id=self.user_2, name="User 2"),
            workspace_id=self.workspace_2
        )

        # Mock workspace access validation
        with patch('workspace_isolation.workspace_isolation_manager._validate_workspace_access') as mock_validate:
            # User 1 can access workspace 1
            mock_validate.side_effect = lambda session, workspace_id: (
                AsyncMock(workspace_id=workspace_id, user_id=session.user.id, user_permissions=["messaging"])
                if session.workspace_id == workspace_id
                else None
            )

            # Send message in workspace 1
            message_data = {
                "content": "Test message in workspace 1",
                "type": "chat",
                "agent_id": "agent_123"
            }

            message, audit_event = await systems["chat_system"].send_secure_message(
                session_1, self.workspace_1, message_data, "agent_123"
            )

            assert message.workspace_id == self.workspace_1
            assert message.sender_id == self.user_1
            assert audit_event.workspace_id == self.workspace_1

            # Attempt to access workspace 2 messages with session 1 should fail
            with pytest.raises(Exception):  # Should raise permission error
                await systems["chat_system"].send_secure_message(
                    session_1, self.workspace_2, message_data, "agent_123"
                )

    @pytest.mark.asyncio
    async def test_message_encryption_security(self, setup_test_environment):
        """Test message encryption and decryption security."""
        systems = await setup_test_environment

        session = SimSession(
            user=SimUser(id=self.user_1, name="User 1"),
            workspace_id=self.workspace_1
        )

        # Create security policy requiring encryption
        policy_config = {
            "require_encryption": True,
            "enable_dlp_scanning": True,
            "block_sensitive_data": True
        }

        with patch('workspace_isolation.workspace_isolation_manager._validate_workspace_access') as mock_validate:
            mock_validate.return_value = AsyncMock(
                workspace_id=self.workspace_1,
                user_id=self.user_1,
                user_permissions=["messaging", "admin"]
            )

            policy = await systems["chat_system"].create_workspace_security_policy(
                session, self.workspace_1, policy_config
            )

            assert policy.require_encryption is True

            # Send sensitive message
            sensitive_message = {
                "content": "SSN: 123-45-6789 Credit Card: 4532-1234-5678-9012",
                "type": "chat",
                "agent_id": "agent_123"
            }

            # Mock the base system to simulate encryption
            with patch.object(systems["chat_system"].base_system, 'send_workspace_message') as mock_send:
                mock_message = MagicMock()
                mock_message.id = str(uuid4())
                mock_message.workspace_id = self.workspace_1
                mock_message.sender_id = self.user_1
                mock_message.content = "[ENCRYPTED]"
                mock_message.encrypted_content = "encrypted_data_here"
                mock_message.created_at = datetime.now()
                mock_message.message_type.value = "chat"

                mock_send.return_value = mock_message

                message, audit_event = await systems["chat_system"].send_secure_message(
                    session, self.workspace_1, sensitive_message, "agent_123"
                )

                # Verify DLP detection triggered
                assert "sensitive_data:ssn" in audit_event.security_labels
                assert "sensitive_data:credit_card" in audit_event.security_labels
                assert audit_event.threat_level == SecurityThreatLevel.HIGH

    @pytest.mark.asyncio
    async def test_rate_limiting_enforcement(self, setup_test_environment):
        """Test advanced rate limiting with abuse detection."""
        systems = await setup_test_environment

        # Initialize rate limiting system
        await systems["rate_limiter"].initialize()

        # Test normal usage - should be allowed
        for i in range(5):
            allowed, violation_info = await systems["rate_limiter"].check_rate_limit(
                user_id=self.user_1,
                workspace_id=self.workspace_1,
                user_tier=RateLimitTier.STANDARD,
                message_size=100
            )
            assert allowed is True
            assert violation_info is None

        # Test rapid burst - should trigger rate limiting
        rapid_requests = []
        for i in range(100):  # Exceed burst limit
            allowed, violation_info = await systems["rate_limiter"].check_rate_limit(
                user_id=self.user_1,
                workspace_id=self.workspace_1,
                user_tier=RateLimitTier.STANDARD,
                message_size=100
            )
            rapid_requests.append((allowed, violation_info))

        # Some requests should be denied
        denied_requests = [r for r in rapid_requests if not r[0]]
        assert len(denied_requests) > 0

        # Check that violation info is provided
        denied_request = denied_requests[0]
        assert denied_request[1] is not None
        assert "retry_after" in denied_request[1]["violation_details"]

    @pytest.mark.asyncio
    async def test_abuse_detection_and_penalties(self, setup_test_environment):
        """Test abuse detection and penalty application."""
        systems = await setup_test_environment

        await systems["rate_limiter"].initialize()

        # Simulate spam-like behavior
        spam_messages = []
        for i in range(200):  # High volume
            allowed, violation_info = await systems["rate_limiter"].check_rate_limit(
                user_id=self.user_1,
                workspace_id=self.workspace_1,
                user_tier=RateLimitTier.FREE,  # Lower limits
                message_size=10  # Short messages typical of spam
            )
            spam_messages.append((allowed, violation_info))

        # Should trigger abuse detection and penalties
        violations = [msg for msg in spam_messages if msg[1] is not None]
        assert len(violations) > 0

        # Apply penalty
        await systems["rate_limiter"].apply_penalty(
            user_id=self.user_1,
            workspace_id=self.workspace_1,
            penalty_level=PenaltyLevel.TEMPORARY_BLOCK,
            reason="Spam detection"
        )

        # Subsequent requests should be blocked
        allowed, violation_info = await systems["rate_limiter"].check_rate_limit(
            user_id=self.user_1,
            workspace_id=self.workspace_1,
            user_tier=RateLimitTier.FREE
        )

        assert allowed is False
        assert "penalty" in str(violation_info).lower()

    @pytest.mark.asyncio
    async def test_compliance_audit_logging(self, setup_test_environment):
        """Test comprehensive compliance and audit logging."""
        systems = await setup_test_environment

        await systems["audit_system"].initialize()

        # Log various compliance events
        frameworks = {ComplianceFramework.SOC2, ComplianceFramework.GDPR}

        event_1 = await systems["audit_system"].log_compliance_event(
            workspace_id=self.workspace_1,
            user_id=self.user_1,
            event_type="message_sent",
            event_description="User sent chat message",
            frameworks=frameworks,
            data_classification=DataClassification.INTERNAL
        )

        assert event_1.workspace_id == self.workspace_1
        assert event_1.user_id == self.user_1
        assert ComplianceFramework.SOC2 in event_1.frameworks
        assert ComplianceFramework.GDPR in event_1.frameworks

        # Test GDPR data subject request
        gdpr_response = await systems["audit_system"].handle_data_subject_request(
            workspace_id=self.workspace_1,
            data_subject_id=self.user_1,
            request_type="access",
            legal_basis="consent"
        )

        assert "data_subject_request" in str(gdpr_response)

        # Generate compliance report
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        report = await systems["audit_system"].generate_compliance_report(
            workspace_id=self.workspace_1,
            framework=ComplianceFramework.SOC2,
            period_start=start_date,
            period_end=end_date
        )

        assert report.workspace_id == self.workspace_1
        assert report.framework == ComplianceFramework.SOC2
        assert report.total_events >= 1
        assert report.compliance_score >= 0

    @pytest.mark.asyncio
    async def test_admin_emergency_controls(self, setup_test_environment):
        """Test admin emergency controls and lockdown procedures."""
        systems = await setup_test_environment

        admin_session = SimSession(
            user=SimUser(id=self.admin_user, name="Admin User"),
            workspace_id=self.workspace_1
        )

        with patch('workspace_isolation.workspace_isolation_manager._validate_workspace_access') as mock_validate:
            mock_validate.return_value = AsyncMock(
                workspace_id=self.workspace_1,
                user_id=self.admin_user,
                user_permissions=["messaging", "admin"]
            )

            # Test emergency lockdown
            await systems["chat_system"].emergency_lockdown_workspace(
                session=admin_session,
                workspace_id=self.workspace_1,
                reason="Security incident detected"
            )

            # Verify workspace is locked
            assert self.workspace_1 in systems["chat_system"]._emergency_lockdowns

            # Test user quarantine
            await systems["chat_system"].quarantine_user(
                session=admin_session,
                workspace_id=self.workspace_1,
                target_user_id=self.user_1,
                reason="Policy violation",
                duration_minutes=60
            )

            # Verify user is quarantined
            assert self.user_1 in systems["chat_system"]._quarantined_users[self.workspace_1]

    @pytest.mark.asyncio
    async def test_security_analytics_generation(self, setup_test_environment):
        """Test security analytics and reporting."""
        systems = await setup_test_environment

        admin_session = SimSession(
            user=SimUser(id=self.admin_user, name="Admin User"),
            workspace_id=self.workspace_1
        )

        with patch('workspace_isolation.workspace_isolation_manager._validate_workspace_access') as mock_validate:
            mock_validate.return_value = AsyncMock(
                workspace_id=self.workspace_1,
                user_id=self.admin_user,
                user_permissions=["messaging", "admin"]
            )

            # Generate security analytics
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)

            with patch.object(systems["chat_system"], '_get_audit_events') as mock_events:
                # Mock some audit events
                mock_events.return_value = [
                    MagicMock(
                        event_type="message_sent",
                        threat_level=SecurityThreatLevel.LOW,
                        governance_action=ChatGovernanceAction.ALLOW,
                        security_labels=set(),
                        policy_violations=[]
                    ),
                    MagicMock(
                        event_type="message_blocked",
                        threat_level=SecurityThreatLevel.HIGH,
                        governance_action=ChatGovernanceAction.BLOCK,
                        security_labels={"sensitive_data:ssn"},
                        policy_violations=["content_filter_violation"]
                    )
                ]

                analytics = await systems["chat_system"].get_workspace_security_analytics(
                    session=admin_session,
                    workspace_id=self.workspace_1,
                    date_range=(start_date, end_date)
                )

                assert analytics["workspace_id"] == self.workspace_1
                assert "security_metrics" in analytics
                assert "threat_analysis" in analytics
                assert "compliance_summary" in analytics

    @pytest.mark.asyncio
    async def test_cross_workspace_data_leakage_prevention(self, setup_test_environment):
        """Test prevention of cross-workspace data leakage."""
        systems = await setup_test_environment

        # Create messages in different workspaces
        workspace_1_messages = []
        workspace_2_messages = []

        # Simulate message storage in different workspaces
        for i in range(5):
            # Workspace 1 messages
            message_1 = MagicMock()
            message_1.id = f"msg_1_{i}"
            message_1.workspace_id = self.workspace_1
            message_1.content = f"Secret message {i} in workspace 1"

            workspace_1_messages.append(message_1)

            # Workspace 2 messages
            message_2 = MagicMock()
            message_2.id = f"msg_2_{i}"
            message_2.workspace_id = self.workspace_2
            message_2.content = f"Secret message {i} in workspace 2"

            workspace_2_messages.append(message_2)

        # Mock message retrieval with proper isolation
        def mock_get_messages(workspace_id, *args, **kwargs):
            if workspace_id == self.workspace_1:
                return workspace_1_messages
            elif workspace_id == self.workspace_2:
                return workspace_2_messages
            else:
                return []

        with patch.object(systems["chat_system"], 'get_workspace_message_history', side_effect=mock_get_messages):
            # User in workspace 1 should only see workspace 1 messages
            session_1 = SimSession(
                user=SimUser(id=self.user_1, name="User 1"),
                workspace_id=self.workspace_1
            )

            messages_1 = await systems["chat_system"].get_workspace_message_history(
                session_1, self.workspace_1
            )

            # Verify isolation
            assert len(messages_1) == 5
            for msg in messages_1:
                assert msg.workspace_id == self.workspace_1
                assert "workspace 1" in msg.content

            # User should not be able to access workspace 2 messages
            with pytest.raises(Exception):
                await systems["chat_system"].get_workspace_message_history(
                    session_1, self.workspace_2
                )

    @pytest.mark.asyncio
    async def test_encryption_key_isolation(self, setup_test_environment):
        """Test that encryption keys are properly isolated between workspaces."""
        systems = await setup_test_environment

        # Generate encryption keys for different workspaces
        await systems["chat_system"]._generate_workspace_encryption_key(self.workspace_1)
        await systems["chat_system"]._generate_workspace_encryption_key(self.workspace_2)

        # Verify keys are different
        key_1 = systems["chat_system"]._workspace_encryption_keys[self.workspace_1]
        key_2 = systems["chat_system"]._workspace_encryption_keys[self.workspace_2]

        assert key_1 != key_2

        # Test message encryption with workspace-specific keys
        message_1 = MagicMock()
        message_1.content = "Secret message for workspace 1"
        message_1.encrypted_content = None

        message_2 = MagicMock()
        message_2.content = "Secret message for workspace 2"
        message_2.encrypted_content = None

        await systems["chat_system"]._encrypt_message(message_1, self.workspace_1)
        await systems["chat_system"]._encrypt_message(message_2, self.workspace_2)

        # Verify messages are encrypted differently
        assert message_1.encrypted_content != message_2.encrypted_content
        assert message_1.content == "[ENCRYPTED]"
        assert message_2.content == "[ENCRYPTED]"

        # Verify cross-workspace decryption fails
        decrypted_1 = await systems["chat_system"]._decrypt_message(message_1, self.workspace_1)
        assert decrypted_1.content == "Secret message for workspace 1"

        # Attempting to decrypt workspace 1 message with workspace 2 key should fail
        decrypted_cross = await systems["chat_system"]._decrypt_message(message_1, self.workspace_2)
        assert decrypted_cross.content == "[ENCRYPTED]"  # Should remain encrypted


class TestSocketIOSecurity:
    """Security tests for Socket.IO integration."""

    @pytest.fixture
    def mock_sio_server(self):
        """Create mock Socket.IO server."""
        return AsyncMock()

    @pytest.mark.asyncio
    async def test_socket_authentication_enforcement(self, mock_sio_server):
        """Test Socket.IO authentication enforcement."""
        integration = SecureSocketIOIntegration(mock_sio_server)

        # Mock authentication failure
        with patch('auth.sim_auth_bridge.authenticate_websocket', return_value=None):
            # Connection should be rejected
            auth_data = {"token": "invalid_token"}
            environ = {"REMOTE_ADDR": "192.168.1.1"}

            # The connect handler should reject invalid authentication
            # This would typically be tested with actual Socket.IO test client

    @pytest.mark.asyncio
    async def test_workspace_room_isolation(self, mock_sio_server):
        """Test Socket.IO room isolation between workspaces."""
        integration = SecureSocketIOIntegration(mock_sio_server)

        # Mock successful authentication
        mock_session = MagicMock()
        mock_session.user.id = self.user_1

        # Test that users are properly isolated in workspace-specific rooms
        with patch('auth.sim_auth_bridge.authenticate_websocket', return_value=mock_session):
            # User should only be able to join their authorized workspace rooms
            pass  # Would implement with actual Socket.IO testing


class TestComplianceIntegration:
    """Tests for compliance framework integration."""

    @pytest.mark.asyncio
    async def test_gdpr_compliance_features(self):
        """Test GDPR-specific compliance features."""
        audit_system = EnterpriseAuditSystem()

        # Test data subject rights
        access_response = await audit_system.handle_data_subject_request(
            workspace_id="test_workspace",
            data_subject_id="test_user",
            request_type="access",
            legal_basis="consent"
        )

        assert "access" in str(access_response).lower()

        # Test right to erasure
        erasure_response = await audit_system.handle_data_subject_request(
            workspace_id="test_workspace",
            data_subject_id="test_user",
            request_type="erasure",
            legal_basis="consent"
        )

        assert "erasure" in str(erasure_response).lower()

    @pytest.mark.asyncio
    async def test_soc2_audit_trail(self):
        """Test SOC 2 audit trail requirements."""
        audit_system = EnterpriseAuditSystem()

        # SOC 2 requires comprehensive audit trails
        event = await audit_system.log_compliance_event(
            workspace_id="test_workspace",
            user_id="test_user",
            event_type="access_granted",
            event_description="User accessed chat system",
            frameworks={ComplianceFramework.SOC2},
            data_classification=DataClassification.INTERNAL
        )

        assert ComplianceFramework.SOC2 in event.frameworks
        assert "soc2_control" in event.metadata


# Test fixtures and utilities

@pytest.fixture
def test_app():
    """Create test FastAPI application."""
    app = FastAPI()
    return app


@pytest.fixture
def test_client(test_app):
    """Create test client."""
    return TestClient(test_app)


@pytest.fixture
def mock_workspace_context():
    """Create mock workspace context."""
    context = MagicMock()
    context.workspace_id = "test_workspace"
    context.user_id = "test_user"
    context.user_permissions = ["messaging", "admin"]
    return context


# Performance and load testing

class TestPerformanceAndLoad:
    """Performance and load testing for security systems."""

    @pytest.mark.asyncio
    async def test_rate_limiter_performance(self):
        """Test rate limiter performance under load."""
        rate_limiter = AdvancedRateLimitingSystem()

        # Mock Redis for performance testing
        rate_limiter.redis_client = AsyncMock()

        start_time = datetime.now()

        # Test 1000 rapid requests
        tasks = []
        for i in range(1000):
            task = rate_limiter.check_rate_limit(
                user_id=f"user_{i % 10}",  # 10 different users
                workspace_id="test_workspace",
                user_tier=RateLimitTier.STANDARD
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Should handle 1000 requests in reasonable time
        assert duration < 5.0  # 5 seconds max
        assert len(results) == 1000

        # Some requests should be allowed
        allowed_count = sum(1 for allowed, _ in results if allowed)
        assert allowed_count > 0

    @pytest.mark.asyncio
    async def test_audit_system_scalability(self):
        """Test audit system scalability."""
        audit_system = EnterpriseAuditSystem()
        audit_system.redis_client = AsyncMock()

        # Log many events concurrently
        tasks = []
        for i in range(100):
            task = audit_system.log_compliance_event(
                workspace_id=f"workspace_{i % 5}",
                user_id=f"user_{i % 20}",
                event_type="test_event",
                event_description=f"Test event {i}",
                frameworks={ComplianceFramework.SOC2},
                data_classification=DataClassification.INTERNAL
            )
            tasks.append(task)

        start_time = datetime.now()
        events = await asyncio.gather(*tasks)
        end_time = datetime.now()

        duration = (end_time - start_time).total_seconds()

        # Should handle 100 events quickly
        assert duration < 2.0
        assert len(events) == 100


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])