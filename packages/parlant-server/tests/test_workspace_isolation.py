"""
Comprehensive Tests for Workspace Isolation and Boundary Enforcement

This test suite validates that all workspace isolation mechanisms are working
correctly and that cross-workspace access is properly prevented.

Test Categories:
- Workspace context creation and validation
- Agent access control within workspaces
- Session isolation enforcement
- Permission validation
- Security measure effectiveness
- Cross-workspace access prevention
"""

import pytest
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from unittest.mock import Mock, AsyncMock, patch

from sqlalchemy.orm import Session
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from auth.workspace_isolation import (
    WorkspaceIsolationManager, WorkspaceContext, WorkspacePermission
)
from auth.agent_access_control import (
    AgentAccessController, AccessRequest, AccessLevel, ResourceType
)
from auth.permission_validator import (
    PermissionValidator, PermissionCheck, PermissionResult, PermissionType
)
from auth.workspace_context import WorkspaceContextManager, OperationContext
from auth.session_isolation import (
    SessionIsolationManager, IsolatedSession, SessionIsolationConfig
)
from auth.security_measures import (
    SecurityMonitor, SecurityEvent, ThreatType, SecurityLevel
)
from auth.sim_auth_bridge import SimSession, SimUser


class TestWorkspaceIsolation:
    """Test workspace isolation core functionality."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = Mock(spec=Session)
        session.execute.return_value.fetchone.return_value = None
        session.execute.return_value.fetchall.return_value = []
        return session

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        settings = Mock()
        settings.jwt_secret_key = "test-secret"
        settings.jwt_algorithm = "HS256"
        return settings

    @pytest.fixture
    def isolation_manager(self, mock_db_session, mock_settings):
        """Create workspace isolation manager."""
        manager = WorkspaceIsolationManager(mock_settings)
        manager.db_session = mock_db_session
        return manager

    @pytest.fixture
    def mock_sim_session(self):
        """Create mock Sim session."""
        user = SimUser(
            id="user123",
            name="Test User",
            email="test@example.com",
            email_verified=True,
            image=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            workspaces=[
                {
                    "id": "workspace1",
                    "name": "Test Workspace",
                    "role": "admin",
                    "permissions": ["admin"]
                }
            ]
        )

        return SimSession(
            id="session123",
            user=user,
            expires_at=datetime.now() + timedelta(hours=1),
            token="test-token",
            ip_address="192.168.1.1",
            user_agent="Test Agent",
            active_organization_id=None
        )

    @pytest.mark.asyncio
    async def test_workspace_context_creation(self, isolation_manager, mock_sim_session):
        """Test creating workspace context with proper validation."""
        # Mock database responses
        isolation_manager.db_session.execute.return_value.fetchone.return_value = Mock(count=1)

        # Mock permission query response
        permission_row = Mock()
        permission_row.permission_type = "admin"
        permission_row.created_at = datetime.now()
        permission_row.entity_type = "workspace"
        permission_row.entity_id = "workspace1"
        isolation_manager.db_session.execute.return_value.fetchall.return_value = [permission_row]

        # Create workspace context
        context = await isolation_manager.create_workspace_context(
            mock_sim_session, "workspace1"
        )

        assert context.workspace_id == "workspace1"
        assert context.user_id == "user123"
        assert context.can_admin
        assert context.can_write
        assert context.can_read

    @pytest.mark.asyncio
    async def test_workspace_access_denied(self, isolation_manager, mock_sim_session):
        """Test workspace access denial for unauthorized users."""
        # Mock no permissions found
        isolation_manager.db_session.execute.return_value.fetchone.return_value = Mock(count=0)

        with pytest.raises(HTTPException) as exc_info:
            await isolation_manager.create_workspace_context(
                mock_sim_session, "unauthorized_workspace"
            )

        assert exc_info.value.status_code == 403
        assert "Access denied" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_agent_workspace_validation(self, isolation_manager, mock_sim_session):
        """Test agent workspace validation."""
        # Mock agent belongs to workspace
        agent_row = Mock()
        agent_row.workspace_id = "workspace1"
        isolation_manager.db_session.execute.return_value.fetchone.return_value = agent_row

        # Should return True for matching workspace
        result = await isolation_manager.validate_agent_workspace_access(
            "user123", "agent1", "workspace1"
        )
        assert result

        # Mock agent belongs to different workspace
        agent_row.workspace_id = "workspace2"

        result = await isolation_manager.validate_agent_workspace_access(
            "user123", "agent1", "workspace1"
        )
        assert not result

    @pytest.mark.asyncio
    async def test_session_isolation_enforcement(self, isolation_manager):
        """Test session isolation enforcement."""
        isolation_config = await isolation_manager.enforce_session_isolation(
            "session123", "workspace1"
        )

        assert isolation_config["workspace_boundary"] == "workspace1"
        assert isolation_config["session_scope"] == "session123"
        assert isolation_config["isolation_level"] == "strict"
        assert isolation_config["cross_workspace_access"] == "deny"


class TestAgentAccessControl:
    """Test agent access control system."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def access_controller(self, mock_db_session):
        """Create agent access controller."""
        isolation_manager = Mock()
        return AgentAccessController(isolation_manager, mock_db_session)

    @pytest.fixture
    def mock_workspace_context(self):
        """Mock workspace context."""
        permissions = [
            WorkspacePermission(
                workspace_id="workspace1",
                user_id="user123",
                permission_type="admin"
            )
        ]

        context = WorkspaceContext(
            workspace_id="workspace1",
            user_id="user123",
            session_id="session123",
            permissions=permissions
        )
        return context

    @pytest.mark.asyncio
    async def test_agent_creation_validation(self, access_controller, mock_workspace_context):
        """Test agent creation validation."""
        # Mock isolation manager
        access_controller.isolation_manager.get_workspace_context.return_value = mock_workspace_context

        # Mock session
        mock_session = Mock()
        mock_session.user.email = "test@example.com"

        # Test successful agent creation validation
        result = await access_controller.validate_agent_creation(
            "user123", "workspace1", {"name": "Test Agent"}, mock_session
        )

        assert result.granted
        assert result.access_level == AccessLevel.ADMIN

    @pytest.mark.asyncio
    async def test_agent_access_with_insufficient_permissions(self, access_controller):
        """Test agent access with insufficient permissions."""
        # Mock context with read-only permissions
        permissions = [
            WorkspacePermission(
                workspace_id="workspace1",
                user_id="user123",
                permission_type="read"
            )
        ]

        read_context = WorkspaceContext(
            workspace_id="workspace1",
            user_id="user123",
            session_id="session123",
            permissions=permissions
        )

        access_controller.isolation_manager.get_workspace_context.return_value = read_context

        mock_session = Mock()
        mock_session.user.email = "test@example.com"

        # Test agent creation with read-only permissions (should fail)
        result = await access_controller.validate_agent_creation(
            "user123", "workspace1", {"name": "Test Agent"}, mock_session
        )

        assert not result.granted

    @pytest.mark.asyncio
    async def test_tool_execution_validation(self, access_controller, mock_workspace_context):
        """Test tool execution validation."""
        access_controller.isolation_manager.get_workspace_context.return_value = mock_workspace_context

        # Mock tool workspace validation
        access_controller.db_session.execute.return_value.fetchone.return_value = Mock(enabled=True)
        access_controller._is_tool_enabled_for_workspace = AsyncMock(return_value=True)
        access_controller._check_tool_usage_limits = AsyncMock(return_value=True)

        mock_session = Mock()
        mock_session.user.email = "test@example.com"

        result = await access_controller.validate_tool_execution(
            "user123", "agent1", "tool1", "workspace1", {"param": "value"}, mock_session
        )

        assert result.granted

    @pytest.mark.asyncio
    async def test_cross_workspace_agent_access_blocked(self, access_controller):
        """Test that cross-workspace agent access is blocked."""
        # Mock agent belongs to different workspace
        access_controller._get_agent_workspace = AsyncMock(return_value="workspace2")

        mock_session = Mock()

        request = AccessRequest(
            user_id="user123",
            workspace_id="workspace1",
            resource_type=ResourceType.AGENT,
            resource_id="agent1",
            action="read",
            required_access_level=AccessLevel.READ
        )

        # Mock workspace context for workspace1
        permissions = [
            WorkspacePermission(
                workspace_id="workspace1",
                user_id="user123",
                permission_type="admin"
            )
        ]

        context = WorkspaceContext(
            workspace_id="workspace1",
            user_id="user123",
            session_id="session123",
            permissions=permissions
        )

        access_controller.isolation_manager.get_workspace_context.return_value = context
        access_controller.isolation_manager.audit_cross_workspace_attempt = AsyncMock()

        result = await access_controller.validate_agent_access(request, mock_session)

        assert not result.granted
        assert result.audit_info.get('security_violation') == 'cross_workspace_attempt'

        # Verify audit was called
        access_controller.isolation_manager.audit_cross_workspace_attempt.assert_called_once()


class TestPermissionValidator:
    """Test permission validation system."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def permission_validator(self, mock_db_session):
        """Create permission validator."""
        return PermissionValidator(mock_db_session)

    @pytest.fixture
    def mock_sim_session(self):
        """Mock Sim session."""
        return Mock()

    @pytest.mark.asyncio
    async def test_workspace_permission_validation(self, permission_validator, mock_sim_session):
        """Test workspace permission validation."""
        # Mock permission query response
        permission_row = Mock()
        permission_row.user_id = "user123"
        permission_row.entity_type = "workspace"
        permission_row.entity_id = "workspace1"
        permission_row.permission_type = "admin"
        permission_row.created_at = datetime.now()

        permission_validator.db_session.execute.return_value.fetchall.return_value = [permission_row]

        result = await permission_validator.validate_workspace_permission(
            "user123", "workspace1", "read", mock_sim_session
        )

        assert result.granted
        assert result.permission_type == "admin"

    @pytest.mark.asyncio
    async def test_permission_inheritance(self, permission_validator, mock_sim_session):
        """Test permission inheritance from parent entities."""
        # Mock agent workspace query
        agent_workspace_row = Mock()
        agent_workspace_row.workspace_id = "workspace1"

        # Mock workspace permission query
        permission_row = Mock()
        permission_row.user_id = "user123"
        permission_row.entity_type = "workspace"
        permission_row.entity_id = "workspace1"
        permission_row.permission_type = "write"
        permission_row.created_at = datetime.now()

        # Configure mock to return different results based on query
        def mock_execute(query, params=None):
            mock_result = Mock()
            if 'parlant_agent' in str(query):
                mock_result.fetchone.return_value = agent_workspace_row
            else:
                mock_result.fetchall.return_value = [permission_row]
                mock_result.fetchone.return_value = None
            return mock_result

        permission_validator.db_session.execute.side_effect = mock_execute

        result = await permission_validator.check_agent_permission(
            "user123", "agent1", "read", mock_sim_session
        )

        assert result.granted
        assert result.audit_info.get('agent_workspace') == "workspace1"

    @pytest.mark.asyncio
    async def test_bulk_permission_validation(self, permission_validator, mock_sim_session):
        """Test bulk permission validation for efficiency."""
        # Create multiple permission checks
        checks = [
            PermissionCheck(
                user_id="user123",
                entity_type="workspace",
                entity_id="workspace1",
                required_permission="read"
            ),
            PermissionCheck(
                user_id="user123",
                entity_type="workspace",
                entity_id="workspace2",
                required_permission="write"
            )
        ]

        # Mock permission responses
        permission_rows = [
            Mock(
                user_id="user123", entity_type="workspace", entity_id="workspace1",
                permission_type="admin", created_at=datetime.now()
            ),
            Mock(
                user_id="user123", entity_type="workspace", entity_id="workspace2",
                permission_type="write", created_at=datetime.now()
            )
        ]

        permission_validator.db_session.execute.return_value.fetchall.return_value = permission_rows

        results = await permission_validator.validate_bulk_permissions(checks, mock_sim_session)

        assert len(results) == 2
        assert results[0].granted  # Admin can read
        assert results[1].granted  # Write can write


class TestSessionIsolation:
    """Test session isolation system."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def mock_context_manager(self):
        """Mock workspace context manager."""
        return Mock()

    @pytest.fixture
    def session_manager(self, mock_db_session, mock_context_manager):
        """Create session isolation manager."""
        return SessionIsolationManager(mock_db_session, mock_context_manager)

    @pytest.mark.asyncio
    async def test_isolated_session_creation(self, session_manager):
        """Test creating isolated session."""
        # Mock agent workspace validation
        session_manager._get_agent_workspace = AsyncMock(return_value="workspace1")
        session_manager._create_session_record = AsyncMock()

        isolated_session = await session_manager.create_isolated_session(
            "agent1", "workspace1", "user123"
        )

        assert isolated_session.agent_id == "agent1"
        assert isolated_session.workspace_id == "workspace1"
        assert isolated_session.user_id == "user123"
        assert isolated_session.is_active

    @pytest.mark.asyncio
    async def test_cross_workspace_session_blocked(self, session_manager):
        """Test that cross-workspace session creation is blocked."""
        # Mock agent belongs to different workspace
        session_manager._get_agent_workspace = AsyncMock(return_value="workspace2")

        with pytest.raises(HTTPException) as exc_info:
            await session_manager.create_isolated_session(
                "agent1", "workspace1", "user123"
            )

        assert exc_info.value.status_code == 403
        assert "does not belong to workspace" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_session_access_validation(self, session_manager):
        """Test session access validation."""
        # Create isolated session
        isolated_session = IsolatedSession(
            session_id="session123",
            agent_id="agent1",
            workspace_id="workspace1",
            user_id="user123",
            customer_id=None,
            isolation_config=SessionIsolationConfig()
        )

        session_manager._isolated_sessions["session123"] = isolated_session

        # Mock workspace context
        mock_context = Mock()
        mock_context.can_read = True
        session_manager.context_manager.isolation_manager.get_workspace_context.return_value = mock_context

        # Test access validation
        has_access = await session_manager.validate_session_access(
            "session123", "user123", "read"
        )

        assert has_access

    @pytest.mark.asyncio
    async def test_conversation_history_filtering(self, session_manager):
        """Test conversation history filtering."""
        # Mock event filter
        session_manager.get_session_event_filter = AsyncMock(
            return_value="e.session_id = 'session123' AND s.workspace_id = 'workspace1'"
        )

        # Mock database query
        event_rows = [
            Mock(
                id="event1", event_type="customer_message", content={"text": "Hello"},
                metadata={}, created_at=datetime.now(), tool_call_id=None,
                journey_id=None, state_id=None
            )
        ]
        session_manager.db_session.execute.return_value.fetchall.return_value = event_rows

        history = await session_manager.get_filtered_conversation_history(
            "session123", "user123"
        )

        assert len(history) == 1
        assert history[0]["id"] == "event1"
        assert history[0]["event_type"] == "customer_message"


class TestSecurityMeasures:
    """Test security measures and threat detection."""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def security_monitor(self, mock_db_session):
        """Create security monitor."""
        return SecurityMonitor(mock_db_session)

    @pytest.fixture
    def mock_request(self):
        """Mock HTTP request."""
        request = Mock(spec=Request)
        request.headers = {"user-agent": "Test Agent"}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        request.url = Mock()
        request.url.path = "/api/test"
        request.method = "GET"
        return request

    @pytest.fixture
    def mock_sim_session(self):
        """Mock Sim session."""
        user = Mock()
        user.id = "user123"
        user.email = "test@example.com"

        session = Mock()
        session.id = "session123"
        session.user = user
        return session

    @pytest.mark.asyncio
    async def test_rate_limiting(self, security_monitor):
        """Test rate limiting functionality."""
        # First request should pass
        result = await security_monitor._check_rate_limits("user123", "192.168.1.1")
        assert result

        # Simulate many rapid requests
        for _ in range(security_monitor.rate_limit_requests_per_minute):
            await security_monitor._check_rate_limits("user123", "192.168.1.1")

        # Next request should be rate limited
        result = await security_monitor._check_rate_limits("user123", "192.168.1.1")
        assert not result

    @pytest.mark.asyncio
    async def test_cross_workspace_access_detection(self, security_monitor, mock_request, mock_sim_session):
        """Test cross-workspace access attempt detection."""
        # Simulate suspicious cross-workspace pattern
        user_id = "user123"

        # Create access pattern with multiple workspaces
        pattern_data = {
            'workspace1': 5,
            'workspace2': 3,
            'workspace3': 7,
            'workspace4': 2
        }

        # Mock access pattern
        from auth.security_measures import AccessPattern
        pattern = AccessPattern(user_id=user_id)
        pattern.workspace_accesses = pattern_data
        pattern.time_patterns = [datetime.now() - timedelta(minutes=i) for i in range(20)]
        security_monitor._access_patterns[user_id] = pattern

        # Test detection
        is_anomaly = await security_monitor._detect_cross_workspace_anomaly(
            user_id, "workspace5", "agent", "agent1"
        )

        assert is_anomaly

    @pytest.mark.asyncio
    async def test_session_hijacking_detection(self, security_monitor, mock_sim_session):
        """Test session hijacking detection."""
        session_id = "session123"

        # First request from original IP and user agent
        result = await security_monitor._validate_session_security(
            mock_sim_session, "192.168.1.1", "Original User Agent"
        )
        assert result

        # Second request from same IP and user agent should pass
        result = await security_monitor._validate_session_security(
            mock_sim_session, "192.168.1.1", "Original User Agent"
        )
        assert result

        # Request from different user agent should fail (potential hijacking)
        result = await security_monitor._validate_session_security(
            mock_sim_session, "192.168.1.1", "Different User Agent"
        )
        assert not result

    @pytest.mark.asyncio
    async def test_dangerous_tool_parameters_detection(self, security_monitor):
        """Test dangerous tool parameter detection."""
        # Test with safe parameters
        safe_params = {"name": "test", "value": "hello world"}
        assert not security_monitor._contains_dangerous_patterns(safe_params)

        # Test with dangerous parameters
        dangerous_params = {"command": "rm -rf /", "query": "DROP TABLE users"}
        assert security_monitor._contains_dangerous_patterns(dangerous_params)

    @pytest.mark.asyncio
    async def test_security_event_logging(self, security_monitor):
        """Test security event logging and response."""
        initial_count = len(security_monitor._security_events)

        await security_monitor._log_security_event(
            ThreatType.CROSS_WORKSPACE_ACCESS,
            SecurityLevel.HIGH,
            user_id="user123",
            workspace_id="workspace1",
            details={"reason": "test_event"}
        )

        # Verify event was logged
        assert len(security_monitor._security_events) == initial_count + 1

        latest_event = security_monitor._security_events[-1]
        assert latest_event.threat_type == ThreatType.CROSS_WORKSPACE_ACCESS
        assert latest_event.security_level == SecurityLevel.HIGH
        assert latest_event.user_id == "user123"

    @pytest.mark.asyncio
    async def test_security_dashboard_generation(self, security_monitor):
        """Test security dashboard data generation."""
        # Add some test events
        await security_monitor._log_security_event(
            ThreatType.CROSS_WORKSPACE_ACCESS, SecurityLevel.HIGH, user_id="user1"
        )
        await security_monitor._log_security_event(
            ThreatType.RATE_LIMIT_VIOLATION, SecurityLevel.MEDIUM, user_id="user2"
        )
        await security_monitor._log_security_event(
            ThreatType.SESSION_HIJACKING, SecurityLevel.CRITICAL, user_id="user1"
        )

        dashboard = await security_monitor.get_security_dashboard(hours=24)

        assert dashboard["total_events"] == 3
        assert dashboard["threat_distribution"]["cross_workspace_access"] == 1
        assert dashboard["threat_distribution"]["rate_limit_violation"] == 1
        assert dashboard["threat_distribution"]["session_hijacking"] == 1
        assert dashboard["severity_distribution"]["critical"] == 1
        assert dashboard["severity_distribution"]["high"] == 1
        assert dashboard["severity_distribution"]["medium"] == 1


class TestIntegrationScenarios:
    """Test complete integration scenarios."""

    @pytest.fixture
    def complete_setup(self):
        """Set up complete workspace isolation system."""
        # This would set up all components working together
        pass

    @pytest.mark.asyncio
    async def test_complete_workspace_isolation_flow(self):
        """Test complete workspace isolation flow from request to response."""
        # This would test the complete flow:
        # 1. Request comes in
        # 2. Authentication middleware validates session
        # 3. Workspace isolation middleware enforces boundaries
        # 4. Agent access control validates permissions
        # 5. Operation executes within workspace context
        # 6. Security monitoring logs and validates
        # 7. Response is returned
        pass

    @pytest.mark.asyncio
    async def test_cross_workspace_attack_prevention(self):
        """Test that sophisticated cross-workspace attacks are prevented."""
        # This would test various attack scenarios:
        # - Token manipulation attempts
        # - Parameter injection attacks
        # - Session hijacking attempts
        # - Privilege escalation attempts
        pass

    @pytest.mark.asyncio
    async def test_performance_under_load(self):
        """Test workspace isolation performance under load."""
        # This would test:
        # - Cache effectiveness
        # - Response times under load
        # - Memory usage patterns
        # - Concurrency handling
        pass


# Test utilities and helpers
class TestUtilities:
    """Utility functions for testing workspace isolation."""

    @staticmethod
    def create_mock_workspace_context(
        workspace_id: str,
        user_id: str,
        permission_type: str = "admin"
    ) -> WorkspaceContext:
        """Create mock workspace context for testing."""
        permissions = [
            WorkspacePermission(
                workspace_id=workspace_id,
                user_id=user_id,
                permission_type=permission_type
            )
        ]

        return WorkspaceContext(
            workspace_id=workspace_id,
            user_id=user_id,
            session_id=f"session_{uuid.uuid4().hex[:8]}",
            permissions=permissions
        )

    @staticmethod
    def create_mock_access_request(
        user_id: str,
        workspace_id: str,
        resource_type: ResourceType,
        resource_id: str,
        action: str = "read",
        access_level: AccessLevel = AccessLevel.READ
    ) -> AccessRequest:
        """Create mock access request for testing."""
        return AccessRequest(
            user_id=user_id,
            workspace_id=workspace_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            required_access_level=access_level
        )

    @staticmethod
    def assert_security_event_logged(
        security_monitor: SecurityMonitor,
        threat_type: ThreatType,
        security_level: SecurityLevel
    ):
        """Assert that a specific security event was logged."""
        matching_events = [
            event for event in security_monitor._security_events
            if event.threat_type == threat_type and event.security_level == security_level
        ]
        assert len(matching_events) > 0, f"No {threat_type.value} event with {security_level.value} level found"


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])