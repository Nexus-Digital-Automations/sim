"""
Comprehensive tests for the Parlant Authentication Bridge
Tests all components of the enhanced authentication system
"""

import pytest
import asyncio
import jwt
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from fastapi import Request, Response
from fastapi.testclient import TestClient

# Import components to test
from auth.sim_auth_bridge import SimAuthBridge, SimUser, SimSession
from auth.enhanced_middleware import EnhancedAuthenticationMiddleware
from auth.rate_limiter import RateLimiter, RateLimitRule
from auth.audit_logger import AuditLogger, AuditEventType, AuditSeverity
from auth.security_utils import SessionManager, SecurityContext, TokenType
from auth.init import AuthenticationSystem


class MockSettings:
    """Mock settings for testing."""
    def __init__(self):
        self.jwt_secret_key = "test_secret_key_at_least_32_chars_long_for_security"
        self.jwt_algorithm = "HS256"
        self.sim_base_url = "http://localhost:3000"
        self.audit_log_dir = "/tmp/test_audit"
        self.audit_console_output = False

    def get_sim_base_url(self):
        return self.sim_base_url


class TestSimAuthBridge:
    """Test cases for Sim Authentication Bridge."""

    @pytest.fixture
    async def auth_bridge(self):
        """Create auth bridge for testing."""
        settings = MockSettings()
        bridge = SimAuthBridge(settings)

        # Mock HTTP client
        bridge.http_client = AsyncMock()

        yield bridge
        await bridge.cleanup()

    @pytest.mark.asyncio
    async def test_validate_session_token_success(self, auth_bridge):
        """Test successful session token validation."""
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "user": {
                "id": "user123",
                "name": "Test User",
                "email": "test@example.com",
                "emailVerified": True,
                "image": "https://example.com/avatar.jpg",
                "createdAt": "2023-01-01T00:00:00Z",
                "updatedAt": "2023-01-01T00:00:00Z"
            },
            "session": {
                "id": "session123",
                "expiresAt": (datetime.now() + timedelta(hours=1)).isoformat() + "Z",
                "ipAddress": "127.0.0.1",
                "userAgent": "Test Agent",
                "activeOrganizationId": "org123"
            }
        }

        # Mock workspace API response
        mock_workspaces_response = Mock()
        mock_workspaces_response.status_code = 200
        mock_workspaces_response.json.return_value = {
            "workspaces": [
                {
                    "id": "workspace123",
                    "name": "Test Workspace",
                    "role": "owner",
                    "permissions": ["read", "write", "admin"],
                    "owner_id": "user123",
                    "created_at": "2023-01-01T00:00:00Z"
                }
            ]
        }

        auth_bridge.http_client.get.side_effect = [mock_response, mock_workspaces_response]

        # Test validation
        session = await auth_bridge.validate_session_token("test_token")

        assert session is not None
        assert session.user.id == "user123"
        assert session.user.email == "test@example.com"
        assert session.user.email_verified is True
        assert len(session.user.workspaces) == 1
        assert session.user.workspaces[0]["id"] == "workspace123"

    @pytest.mark.asyncio
    async def test_validate_session_token_expired(self, auth_bridge):
        """Test validation of expired session token."""
        # Mock 401 response (unauthorized)
        mock_response = Mock()
        mock_response.status_code = 401
        auth_bridge.http_client.get.return_value = mock_response

        session = await auth_bridge.validate_session_token("expired_token")
        assert session is None

    @pytest.mark.asyncio
    async def test_workspace_access_validation(self, auth_bridge):
        """Test workspace access validation."""
        # Create test session with workspace
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
                    "id": "workspace123",
                    "name": "Test Workspace",
                    "permissions": ["read", "write"]
                }
            ]
        )

        session = SimSession(
            id="session123",
            user=user,
            expires_at=datetime.now() + timedelta(hours=1),
            token="test_token",
            ip_address="127.0.0.1",
            user_agent="Test Agent",
            active_organization_id="org123"
        )

        # Test valid workspace access
        has_access = await auth_bridge.validate_workspace_access(session, "workspace123")
        assert has_access is True

        # Test invalid workspace access
        has_access = await auth_bridge.validate_workspace_access(session, "invalid_workspace")
        assert has_access is False


class TestRateLimiter:
    """Test cases for Rate Limiter."""

    @pytest.fixture
    def rate_limiter(self):
        """Create rate limiter for testing."""
        return RateLimiter()

    @pytest.mark.asyncio
    async def test_rate_limit_allowed(self, rate_limiter):
        """Test requests within rate limit are allowed."""
        # First request should be allowed
        allowed, info = await rate_limiter.check_rate_limit("test_user", "api_requests")
        assert allowed is True
        assert info["status"] == "allowed"
        assert info["requests_in_window"] == 1

    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self, rate_limiter):
        """Test rate limit exceeded scenario."""
        # Add a strict rule for testing
        strict_rule = RateLimitRule(
            requests_per_window=2,
            window_seconds=60,
            block_duration_seconds=300,
            rule_name="test_strict"
        )
        rate_limiter.add_rule("test_strict", strict_rule)

        # Make requests up to limit
        for i in range(2):
            allowed, _ = await rate_limiter.check_rate_limit("test_user", "test_strict")
            assert allowed is True

        # Next request should be rate limited
        allowed, info = await rate_limiter.check_rate_limit("test_user", "test_strict")
        assert allowed is False
        assert info["status"] == "rate_limited"

    @pytest.mark.asyncio
    async def test_rate_limit_cleanup(self, rate_limiter):
        """Test rate limit bucket cleanup."""
        # Add some buckets
        await rate_limiter.check_rate_limit("user1", "api_requests")
        await rate_limiter.check_rate_limit("user2", "api_requests")

        initial_count = len(rate_limiter.buckets)
        assert initial_count > 0

        # Clean up should not affect recent buckets
        await rate_limiter.cleanup_expired_buckets()
        assert len(rate_limiter.buckets) == initial_count


class TestAuditLogger:
    """Test cases for Audit Logger."""

    @pytest.fixture
    def audit_logger(self):
        """Create audit logger for testing."""
        return AuditLogger(
            log_file_path=None,  # No file logging for tests
            enable_console_output=False,
            batch_size=10,
            flush_interval_seconds=1
        )

    @pytest.mark.asyncio
    async def test_log_auth_attempt(self, audit_logger):
        """Test logging authentication attempts."""
        await audit_logger.log_auth_attempt(
            "user123",
            success=True,
            ip_address="127.0.0.1",
            user_agent="Test Agent"
        )

        stats = audit_logger.get_stats()
        assert stats["total_events"] == 1
        assert stats["events_by_type"]["auth_success"] == 1

    @pytest.mark.asyncio
    async def test_log_failed_auth_attempt(self, audit_logger):
        """Test logging failed authentication attempts."""
        await audit_logger.log_auth_attempt(
            "user123",
            success=False,
            ip_address="127.0.0.1",
            error_message="Invalid credentials",
            metadata={"failure_count": 3}
        )

        stats = audit_logger.get_stats()
        assert stats["total_events"] == 1
        assert stats["events_by_type"]["auth_failure"] == 1

    @pytest.mark.asyncio
    async def test_log_security_alert(self, audit_logger):
        """Test logging security alerts."""
        await audit_logger.log_security_alert(
            "brute_force_detected",
            user_id="user123",
            ip_address="127.0.0.1",
            details={"attempt_count": 10}
        )

        stats = audit_logger.get_stats()
        assert stats["security_alerts"] == 1


class TestSessionManager:
    """Test cases for Session Manager."""

    @pytest.fixture
    def session_manager(self):
        """Create session manager for testing."""
        return SessionManager("test_secret_key_at_least_32_chars_long")

    @pytest.mark.asyncio
    async def test_create_session_token(self, session_manager):
        """Test creating session tokens."""
        security_context = SecurityContext(
            ip_address="127.0.0.1",
            user_agent="Test Agent",
            request_fingerprint="test_fingerprint"
        )

        token_data = await session_manager.create_session_token(
            "user123",
            workspace_id="workspace123",
            security_context=security_context
        )

        assert "session_token" in token_data
        assert "refresh_token" in token_data
        assert "session_id" in token_data
        assert "expires_at" in token_data
        assert token_data["workspace_id"] == "workspace123"

        # Verify token can be decoded
        payload = jwt.decode(
            token_data["session_token"],
            "test_secret_key_at_least_32_chars_long",
            algorithms=["HS256"]
        )
        assert payload["user_id"] == "user123"
        assert payload["workspace_id"] == "workspace123"

    @pytest.mark.asyncio
    async def test_validate_session_token(self, session_manager):
        """Test validating session tokens."""
        # Create a session first
        security_context = SecurityContext(
            ip_address="127.0.0.1",
            user_agent="Test Agent",
            request_fingerprint="test_fingerprint"
        )

        token_data = await session_manager.create_session_token(
            "user123",
            security_context=security_context
        )

        # Validate the token
        is_valid, session_data = await session_manager.validate_and_refresh_session(
            token_data["session_token"],
            security_context
        )

        assert is_valid is True
        assert session_data["action"] == "token_valid"
        assert session_data["user_id"] == "user123"

    @pytest.mark.asyncio
    async def test_revoke_session(self, session_manager):
        """Test revoking sessions."""
        # Create a session
        security_context = SecurityContext(
            ip_address="127.0.0.1",
            user_agent="Test Agent",
            request_fingerprint="test_fingerprint"
        )

        token_data = await session_manager.create_session_token(
            "user123",
            security_context=security_context
        )

        session_id = token_data["session_id"]

        # Revoke the session
        await session_manager.revoke_session(session_id, "test_revocation")

        # Verify session is revoked
        token_info = session_manager.active_tokens[session_id]
        assert token_info.is_revoked is True
        assert token_info.revoked_reason == "test_revocation"


class TestEnhancedMiddleware:
    """Test cases for Enhanced Authentication Middleware."""

    @pytest.fixture
    def mock_auth_bridge(self):
        """Create mock auth bridge for middleware testing."""
        bridge = Mock(spec=SimAuthBridge)

        # Mock successful authentication
        user = SimUser(
            id="user123",
            name="Test User",
            email="test@example.com",
            email_verified=True,
            image=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            workspaces=[{
                "id": "workspace123",
                "name": "Test Workspace",
                "permissions": ["read", "write"]
            }]
        )

        session = SimSession(
            id="session123",
            user=user,
            expires_at=datetime.now() + timedelta(hours=1),
            token="test_token",
            ip_address="127.0.0.1",
            user_agent="Test Agent",
            active_organization_id="org123"
        )

        bridge.authenticate_request = AsyncMock(return_value=session)
        bridge.validate_workspace_access = AsyncMock(return_value=True)

        return bridge

    @pytest.fixture
    def middleware(self, mock_auth_bridge):
        """Create middleware instance for testing."""
        return EnhancedAuthenticationMiddleware(None, mock_auth_bridge)

    def test_is_public_endpoint(self, middleware):
        """Test public endpoint detection."""
        assert middleware._is_public_endpoint("/health") is True
        assert middleware._is_public_endpoint("/docs") is True
        assert middleware._is_public_endpoint("/api/v1/agents") is False
        assert middleware._is_public_endpoint("/static/css/style.css") is True

    def test_get_client_ip(self, middleware):
        """Test client IP extraction."""
        # Mock request with forwarded header
        request = Mock()
        request.headers.get.side_effect = lambda key: {
            "X-Forwarded-For": "192.168.1.1, 10.0.0.1",
            "X-Real-IP": "192.168.1.1"
        }.get(key)
        request.client = None

        ip = middleware._get_client_ip(request)
        assert ip == "192.168.1.1"


class TestAuthenticationSystem:
    """Test cases for overall Authentication System."""

    @pytest.fixture
    def settings(self):
        """Create test settings."""
        return MockSettings()

    @pytest.mark.asyncio
    async def test_authentication_system_initialization(self, settings):
        """Test authentication system initialization."""
        auth_system = AuthenticationSystem(settings)

        # Mock HTTP client initialization to avoid actual network calls
        with patch('auth.sim_auth_bridge.httpx.AsyncClient'):
            with patch('auth.sim_auth_bridge.SimAuthBridge._test_sim_connection', return_value=True):
                success = await auth_system.initialize()

                assert success is True
                assert auth_system.is_initialized is True
                assert auth_system.auth_bridge is not None
                assert auth_system.rate_limiter is not None
                assert auth_system.audit_logger is not None
                assert auth_system.session_manager is not None

        await auth_system.shutdown()

    @pytest.mark.asyncio
    async def test_authentication_system_health_check(self, settings):
        """Test authentication system health check."""
        auth_system = AuthenticationSystem(settings)

        with patch('auth.sim_auth_bridge.httpx.AsyncClient'):
            with patch('auth.sim_auth_bridge.SimAuthBridge._test_sim_connection', return_value=True):
                await auth_system.initialize()

                health = auth_system.get_health_check()

                assert health["healthy"] is True
                assert health["status"] == "healthy"
                assert all(
                    comp["status"] == "healthy"
                    for comp in health["components"].values()
                )

        await auth_system.shutdown()


# Integration test
class TestIntegrationScenarios:
    """Integration tests for complete authentication flows."""

    @pytest.mark.asyncio
    async def test_complete_authentication_flow(self):
        """Test complete authentication flow from request to response."""
        settings = MockSettings()

        # Mock successful Sim API responses
        with patch('auth.sim_auth_bridge.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value = mock_instance

            # Mock session validation response
            mock_session_response = Mock()
            mock_session_response.status_code = 200
            mock_session_response.json.return_value = {
                "user": {
                    "id": "user123",
                    "name": "Test User",
                    "email": "test@example.com",
                    "emailVerified": True,
                    "image": None,
                    "createdAt": "2023-01-01T00:00:00Z",
                    "updatedAt": "2023-01-01T00:00:00Z"
                },
                "session": {
                    "id": "session123",
                    "expiresAt": (datetime.now() + timedelta(hours=1)).isoformat() + "Z",
                    "ipAddress": "127.0.0.1",
                    "userAgent": "Test Agent",
                    "activeOrganizationId": "org123"
                }
            }

            # Mock workspaces response
            mock_workspaces_response = Mock()
            mock_workspaces_response.status_code = 200
            mock_workspaces_response.json.return_value = {
                "workspaces": [
                    {
                        "id": "workspace123",
                        "name": "Test Workspace",
                        "permissions": ["read", "write", "admin"],
                        "role": "owner",
                        "owner_id": "user123",
                        "created_at": "2023-01-01T00:00:00Z"
                    }
                ]
            }

            # Health check response
            mock_health_response = Mock()
            mock_health_response.status_code = 200

            mock_instance.get.side_effect = [
                mock_health_response,  # Health check
                mock_session_response,  # Session validation
                mock_workspaces_response  # Workspaces
            ]

            # Initialize authentication system
            auth_system = AuthenticationSystem(settings)
            success = await auth_system.initialize()

            assert success is True

            # Test authentication bridge directly
            session = await auth_system.auth_bridge.validate_session_token("test_token")
            assert session is not None
            assert session.user.id == "user123"
            assert len(session.user.workspaces) == 1

            # Test workspace access
            has_access = await auth_system.auth_bridge.validate_workspace_access(
                session, "workspace123"
            )
            assert has_access is True

            # Test rate limiting
            allowed, _ = await auth_system.rate_limiter.check_rate_limit(
                "127.0.0.1", "api_requests"
            )
            assert allowed is True

            # Test session manager
            security_context = SecurityContext(
                ip_address="127.0.0.1",
                user_agent="Test Agent",
                request_fingerprint="test_fingerprint"
            )

            token_data = await auth_system.session_manager.create_session_token(
                "user123",
                workspace_id="workspace123",
                security_context=security_context
            )
            assert "session_token" in token_data

            await auth_system.shutdown()


# Performance tests
class TestPerformance:
    """Performance tests for authentication components."""

    @pytest.mark.asyncio
    async def test_rate_limiter_performance(self):
        """Test rate limiter performance with concurrent requests."""
        rate_limiter = RateLimiter()

        async def make_request(user_id: str):
            return await rate_limiter.check_rate_limit(user_id, "api_requests")

        # Test concurrent requests
        start_time = datetime.now()

        tasks = [make_request(f"user_{i}") for i in range(100)]
        results = await asyncio.gather(*tasks)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Should complete 100 rate limit checks in reasonable time
        assert duration < 1.0  # Less than 1 second
        assert all(result[0] is True for result in results)  # All should be allowed


if __name__ == "__main__":
    pytest.main([__file__, "-v"])