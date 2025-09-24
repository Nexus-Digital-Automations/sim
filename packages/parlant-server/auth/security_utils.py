"""
Security utilities for Parlant authentication system
Includes session refresh, token rotation, and security validations
"""

import asyncio
import hashlib
import secrets
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

import jwt
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import bcrypt

from auth.sim_auth_bridge import SimSession, SimUser
from auth.audit_logger import audit_session_event, audit_security_alert, AuditEventType

logger = logging.getLogger(__name__)


class TokenType(Enum):
    """Types of tokens in the system."""
    SESSION_TOKEN = "session"
    REFRESH_TOKEN = "refresh"
    API_TOKEN = "api"
    WORKSPACE_TOKEN = "workspace"


@dataclass
class TokenInfo:
    """Information about a token."""
    token_id: str
    token_type: TokenType
    user_id: str
    workspace_id: Optional[str]
    issued_at: datetime
    expires_at: datetime
    last_used: Optional[datetime]
    usage_count: int = 0
    is_revoked: bool = False
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None


@dataclass
class SecurityContext:
    """Security context for requests."""
    ip_address: str
    user_agent: str
    request_fingerprint: str
    geo_location: Optional[Dict[str, str]] = None
    is_suspicious: bool = False
    risk_score: int = 0
    threat_indicators: List[str] = None

    def __post_init__(self):
        if self.threat_indicators is None:
            self.threat_indicators = []


class SessionManager:
    """
    Advanced session management with security features:
    - Automatic session refresh
    - Token rotation
    - Anomaly detection
    - Session isolation by workspace
    """

    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.algorithm = "HS256"

        # Token storage (in production, use Redis or database)
        self.active_tokens: Dict[str, TokenInfo] = {}
        self.session_cache: Dict[str, Dict[str, Any]] = {}

        # Security tracking
        self.session_fingerprints: Dict[str, List[str]] = {}  # Track session fingerprints
        self.anomaly_scores: Dict[str, float] = {}  # Track anomaly scores per user

        # Configuration
        self.session_lifetime = timedelta(hours=24)
        self.refresh_lifetime = timedelta(days=30)
        self.rotation_threshold = timedelta(hours=2)  # Rotate tokens every 2 hours

        logger.info("Session manager initialized")

    async def create_session_token(self,
                                 user_id: str,
                                 workspace_id: Optional[str] = None,
                                 security_context: Optional[SecurityContext] = None) -> Dict[str, Any]:
        """
        Create a new session token with security context.

        Args:
            user_id: ID of the authenticated user
            workspace_id: Optional workspace scope
            security_context: Security context from request

        Returns:
            Dictionary containing session token, refresh token, and metadata
        """
        now = datetime.now()
        session_id = self._generate_token_id()

        # Create session payload
        session_payload = {
            "session_id": session_id,
            "user_id": user_id,
            "workspace_id": workspace_id,
            "iat": int(now.timestamp()),
            "exp": int((now + self.session_lifetime).timestamp()),
            "type": TokenType.SESSION_TOKEN.value
        }

        # Add security context fingerprint
        if security_context:
            session_payload["fingerprint"] = security_context.request_fingerprint
            session_payload["ip_hash"] = self._hash_ip(security_context.ip_address)

        # Generate session token
        session_token = jwt.encode(session_payload, self.secret_key, algorithm=self.algorithm)

        # Create refresh token
        refresh_payload = {
            "session_id": session_id,
            "user_id": user_id,
            "iat": int(now.timestamp()),
            "exp": int((now + self.refresh_lifetime).timestamp()),
            "type": TokenType.REFRESH_TOKEN.value
        }

        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=self.algorithm)

        # Store token information
        session_info = TokenInfo(
            token_id=session_id,
            token_type=TokenType.SESSION_TOKEN,
            user_id=user_id,
            workspace_id=workspace_id,
            issued_at=now,
            expires_at=now + self.session_lifetime,
            last_used=now
        )

        self.active_tokens[session_id] = session_info

        # Track session fingerprint for anomaly detection
        if security_context:
            await self._track_session_fingerprint(user_id, security_context)

        # Log session creation
        await audit_session_event(
            AuditEventType.SESSION_CREATED,
            session_id,
            user_id=user_id,
            workspace_id=workspace_id,
            metadata={
                "ip_address": security_context.ip_address if security_context else None,
                "user_agent": security_context.user_agent if security_context else None,
                "session_lifetime_hours": self.session_lifetime.total_seconds() / 3600
            }
        )

        logger.info(f"Created session token for user {user_id} (session: {session_id})")

        return {
            "session_token": session_token,
            "refresh_token": refresh_token,
            "session_id": session_id,
            "expires_at": session_info.expires_at.isoformat(),
            "workspace_id": workspace_id
        }

    async def validate_and_refresh_session(self,
                                         token: str,
                                         security_context: Optional[SecurityContext] = None) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Validate session token and refresh if needed.

        Args:
            token: Session token to validate
            security_context: Current request security context

        Returns:
            Tuple of (is_valid, session_data_or_new_tokens)
        """
        try:
            # Decode and validate token
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            session_id = payload.get("session_id")
            user_id = payload.get("user_id")
            workspace_id = payload.get("workspace_id")

            if not session_id or not user_id:
                return False, None

            # Check if token is in active tokens
            if session_id not in self.active_tokens:
                logger.warning(f"Session {session_id} not found in active tokens")
                return False, None

            token_info = self.active_tokens[session_id]

            # Check if token is revoked
            if token_info.is_revoked:
                logger.warning(f"Session {session_id} is revoked")
                return False, None

            # Update usage tracking
            token_info.last_used = datetime.now()
            token_info.usage_count += 1

            # Check for anomalies
            if security_context:
                anomaly_detected = await self._detect_session_anomalies(
                    user_id, session_id, payload, security_context
                )

                if anomaly_detected:
                    await self._handle_session_anomaly(session_id, user_id, security_context)
                    return False, None

            # Check if token needs rotation
            now = datetime.now()
            time_since_issue = now - token_info.issued_at

            if time_since_issue > self.rotation_threshold:
                # Rotate the token
                logger.info(f"Rotating session token for user {user_id} (session: {session_id})")

                # Revoke old token
                await self.revoke_session(session_id, "token_rotation")

                # Create new session
                new_session = await self.create_session_token(
                    user_id, workspace_id, security_context
                )

                # Log token rotation
                await audit_session_event(
                    AuditEventType.SESSION_CREATED,
                    new_session["session_id"],
                    user_id=user_id,
                    workspace_id=workspace_id,
                    metadata={
                        "reason": "token_rotation",
                        "previous_session": session_id,
                        "rotation_threshold_hours": self.rotation_threshold.total_seconds() / 3600
                    }
                )

                return True, {
                    "action": "token_rotated",
                    "new_tokens": new_session,
                    "user_id": user_id,
                    "workspace_id": workspace_id
                }

            # Token is valid and doesn't need rotation
            return True, {
                "action": "token_valid",
                "session_id": session_id,
                "user_id": user_id,
                "workspace_id": workspace_id,
                "expires_at": token_info.expires_at.isoformat()
            }

        except jwt.ExpiredSignatureError:
            logger.info(f"Session token expired")
            return False, None

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid session token: {e}")
            return False, None

        except Exception as e:
            logger.error(f"Error validating session token: {e}")
            return False, None

    async def refresh_session_with_refresh_token(self,
                                               refresh_token: str,
                                               security_context: Optional[SecurityContext] = None) -> Optional[Dict[str, Any]]:
        """
        Create new session using refresh token.

        Args:
            refresh_token: Valid refresh token
            security_context: Security context from request

        Returns:
            New session tokens or None if invalid
        """
        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=[self.algorithm])

            if payload.get("type") != TokenType.REFRESH_TOKEN.value:
                logger.warning("Invalid refresh token type")
                return None

            user_id = payload.get("user_id")
            old_session_id = payload.get("session_id")

            if not user_id:
                return None

            # Revoke the old session if it exists
            if old_session_id and old_session_id in self.active_tokens:
                await self.revoke_session(old_session_id, "refresh_token_used")

            # Create new session
            new_session = await self.create_session_token(
                user_id, None, security_context
            )

            logger.info(f"Refreshed session for user {user_id}")

            return new_session

        except jwt.ExpiredSignatureError:
            logger.info("Refresh token expired")
            return None

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token: {e}")
            return None

        except Exception as e:
            logger.error(f"Error refreshing session: {e}")
            return None

    async def revoke_session(self, session_id: str, reason: str = "manual"):
        """
        Revoke a session token.

        Args:
            session_id: Session ID to revoke
            reason: Reason for revocation
        """
        if session_id in self.active_tokens:
            token_info = self.active_tokens[session_id]
            token_info.is_revoked = True
            token_info.revoked_at = datetime.now()
            token_info.revoked_reason = reason

            # Log session termination
            await audit_session_event(
                AuditEventType.SESSION_TERMINATED,
                session_id,
                user_id=token_info.user_id,
                workspace_id=token_info.workspace_id,
                metadata={
                    "reason": reason,
                    "session_lifetime_seconds": (datetime.now() - token_info.issued_at).total_seconds()
                }
            )

            logger.info(f"Revoked session {session_id} (reason: {reason})")

    async def revoke_all_user_sessions(self, user_id: str, reason: str = "security"):
        """
        Revoke all sessions for a specific user.

        Args:
            user_id: User ID whose sessions to revoke
            reason: Reason for mass revocation
        """
        revoked_count = 0

        for session_id, token_info in self.active_tokens.items():
            if token_info.user_id == user_id and not token_info.is_revoked:
                await self.revoke_session(session_id, reason)
                revoked_count += 1

        if revoked_count > 0:
            await audit_security_alert(
                "mass_session_revocation",
                user_id=user_id,
                details={
                    "revoked_sessions": revoked_count,
                    "reason": reason
                }
            )

        logger.info(f"Revoked {revoked_count} sessions for user {user_id}")

    async def _track_session_fingerprint(self, user_id: str, security_context: SecurityContext):
        """Track session fingerprints for anomaly detection."""
        if user_id not in self.session_fingerprints:
            self.session_fingerprints[user_id] = []

        fingerprint = security_context.request_fingerprint

        # Add fingerprint if new
        if fingerprint not in self.session_fingerprints[user_id]:
            self.session_fingerprints[user_id].append(fingerprint)

            # Keep only recent fingerprints (max 10)
            if len(self.session_fingerprints[user_id]) > 10:
                self.session_fingerprints[user_id] = self.session_fingerprints[user_id][-10:]

    async def _detect_session_anomalies(self,
                                      user_id: str,
                                      session_id: str,
                                      token_payload: Dict[str, Any],
                                      security_context: SecurityContext) -> bool:
        """
        Detect anomalies in session usage patterns.

        Returns:
            True if anomaly detected, False otherwise
        """
        anomalies = []

        # Check fingerprint consistency
        expected_fingerprint = token_payload.get("fingerprint")
        if expected_fingerprint and expected_fingerprint != security_context.request_fingerprint:
            anomalies.append("fingerprint_mismatch")

        # Check IP consistency
        expected_ip_hash = token_payload.get("ip_hash")
        current_ip_hash = self._hash_ip(security_context.ip_address)
        if expected_ip_hash and expected_ip_hash != current_ip_hash:
            anomalies.append("ip_address_change")

        # Check for rapid session usage
        if session_id in self.active_tokens:
            token_info = self.active_tokens[session_id]
            if token_info.last_used:
                time_since_last_use = (datetime.now() - token_info.last_used).total_seconds()
                if time_since_last_use < 1:  # Less than 1 second
                    anomalies.append("rapid_usage")

        # Check user agent consistency
        known_fingerprints = self.session_fingerprints.get(user_id, [])
        if (len(known_fingerprints) > 0 and
            security_context.request_fingerprint not in known_fingerprints):
            anomalies.append("unknown_fingerprint")

        if anomalies:
            logger.warning(f"Session anomalies detected for user {user_id}: {', '.join(anomalies)}")
            return True

        return False

    async def _handle_session_anomaly(self, session_id: str, user_id: str, security_context: SecurityContext):
        """Handle detected session anomaly."""
        # Log security alert
        await audit_security_alert(
            "session_anomaly_detected",
            user_id=user_id,
            ip_address=security_context.ip_address,
            details={
                "session_id": session_id,
                "threat_indicators": security_context.threat_indicators,
                "risk_score": security_context.risk_score
            }
        )

        # Revoke suspicious session
        await self.revoke_session(session_id, "security_anomaly")

    def _generate_token_id(self) -> str:
        """Generate a unique token ID."""
        return secrets.token_urlsafe(32)

    def _hash_ip(self, ip_address: str) -> str:
        """Hash IP address for privacy-preserving comparison."""
        return hashlib.sha256(f"{ip_address}:{self.secret_key}".encode()).hexdigest()[:16]

    def create_request_fingerprint(self, request_data: Dict[str, Any]) -> str:
        """
        Create a fingerprint for request anomaly detection.

        Args:
            request_data: Dictionary containing request information

        Returns:
            Fingerprint string
        """
        fingerprint_data = {
            "user_agent": request_data.get("user_agent", ""),
            "accept_language": request_data.get("accept_language", ""),
            "accept_encoding": request_data.get("accept_encoding", ""),
            "timezone": request_data.get("timezone", ""),
        }

        # Create hash of fingerprint data
        fingerprint_str = "|".join([f"{k}:{v}" for k, v in sorted(fingerprint_data.items())])
        return hashlib.sha256(fingerprint_str.encode()).hexdigest()[:16]

    def get_session_stats(self) -> Dict[str, Any]:
        """Get session manager statistics."""
        now = datetime.now()
        active_sessions = 0
        expired_sessions = 0
        revoked_sessions = 0

        for token_info in self.active_tokens.values():
            if token_info.is_revoked:
                revoked_sessions += 1
            elif token_info.expires_at < now:
                expired_sessions += 1
            else:
                active_sessions += 1

        return {
            "total_tokens": len(self.active_tokens),
            "active_sessions": active_sessions,
            "expired_sessions": expired_sessions,
            "revoked_sessions": revoked_sessions,
            "tracked_users": len(self.session_fingerprints),
            "session_lifetime_hours": self.session_lifetime.total_seconds() / 3600,
            "rotation_threshold_hours": self.rotation_threshold.total_seconds() / 3600
        }

    async def cleanup_expired_tokens(self):
        """Clean up expired and old revoked tokens."""
        now = datetime.now()
        cleanup_threshold = now - timedelta(days=7)  # Keep revoked tokens for 7 days

        tokens_to_remove = []

        for session_id, token_info in self.active_tokens.items():
            # Remove expired tokens
            if token_info.expires_at < now:
                tokens_to_remove.append(session_id)
            # Remove old revoked tokens
            elif (token_info.is_revoked and token_info.revoked_at and
                  token_info.revoked_at < cleanup_threshold):
                tokens_to_remove.append(session_id)

        for session_id in tokens_to_remove:
            del self.active_tokens[session_id]

        if tokens_to_remove:
            logger.info(f"Cleaned up {len(tokens_to_remove)} expired/old tokens")


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager(secret_key: str = None) -> SessionManager:
    """Get or create the global session manager instance."""
    global _session_manager
    if _session_manager is None:
        if not secret_key:
            raise ValueError("Secret key required for session manager initialization")
        _session_manager = SessionManager(secret_key)
        logger.info("Initialized global session manager")
    return _session_manager


class WorkspaceTokenManager:
    """
    Manage workspace-scoped tokens for agent operations.
    Provides fine-grained access control within workspaces.
    """

    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.algorithm = "HS256"
        self.workspace_tokens: Dict[str, TokenInfo] = {}
        self.token_lifetime = timedelta(hours=8)  # Shorter lifetime for workspace tokens

    async def create_workspace_token(self,
                                   user_id: str,
                                   workspace_id: str,
                                   permissions: List[str],
                                   agent_id: Optional[str] = None) -> str:
        """
        Create a workspace-scoped token for agent operations.

        Args:
            user_id: ID of the user
            workspace_id: ID of the workspace
            permissions: List of permissions for this token
            agent_id: Optional specific agent ID

        Returns:
            Workspace token string
        """
        now = datetime.now()
        token_id = secrets.token_urlsafe(32)

        payload = {
            "token_id": token_id,
            "user_id": user_id,
            "workspace_id": workspace_id,
            "agent_id": agent_id,
            "permissions": permissions,
            "iat": int(now.timestamp()),
            "exp": int((now + self.token_lifetime).timestamp()),
            "type": TokenType.WORKSPACE_TOKEN.value
        }

        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

        # Store token info
        token_info = TokenInfo(
            token_id=token_id,
            token_type=TokenType.WORKSPACE_TOKEN,
            user_id=user_id,
            workspace_id=workspace_id,
            issued_at=now,
            expires_at=now + self.token_lifetime
        )

        self.workspace_tokens[token_id] = token_info

        logger.info(f"Created workspace token for user {user_id} in workspace {workspace_id}")

        return token

    async def validate_workspace_token(self, token: str, required_permission: str = None) -> Optional[Dict[str, Any]]:
        """
        Validate workspace token and check permissions.

        Args:
            token: Workspace token to validate
            required_permission: Optional permission to check

        Returns:
            Token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            if payload.get("type") != TokenType.WORKSPACE_TOKEN.value:
                return None

            token_id = payload.get("token_id")
            if token_id not in self.workspace_tokens:
                return None

            token_info = self.workspace_tokens[token_id]
            if token_info.is_revoked:
                return None

            # Check permissions if required
            if required_permission:
                permissions = payload.get("permissions", [])
                if required_permission not in permissions:
                    logger.warning(f"Permission {required_permission} not found in token permissions: {permissions}")
                    return None

            # Update usage
            token_info.last_used = datetime.now()
            token_info.usage_count += 1

            return payload

        except jwt.ExpiredSignatureError:
            logger.info("Workspace token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid workspace token")
            return None
        except Exception as e:
            logger.error(f"Error validating workspace token: {e}")
            return None