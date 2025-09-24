"""
Secure Token Exchange System
Manages token exchange between Sim and Parlant server with session consistency
"""

import logging
import secrets
import hashlib
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

import redis
from jose import jwt, JWTError
from cryptography.fernet import Fernet
from fastapi import HTTPException

from auth.sim_auth_bridge import SimSession
from config.settings import Settings, get_settings

logger = logging.getLogger(__name__)


class TokenType(Enum):
    """Types of tokens in the system."""
    SESSION_TOKEN = "session_token"
    WORKSPACE_TOKEN = "workspace_token"
    API_TOKEN = "api_token"
    EXCHANGE_TOKEN = "exchange_token"


@dataclass
class TokenMetadata:
    """Metadata associated with a token."""
    token_id: str
    token_type: TokenType
    user_id: str
    workspace_id: Optional[str]
    issued_at: datetime
    expires_at: datetime
    permissions: List[str]
    metadata: Dict[str, Any]


@dataclass
class SessionToken:
    """Secure session token with encrypted payload."""
    token: str
    encrypted_payload: str
    signature: str
    expires_at: datetime


class TokenExchangeService:
    """Manages secure token exchange between Sim and Parlant."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._redis_client = None
        self._encryption_key = self._derive_encryption_key()

        # Token configuration
        self.session_token_ttl = timedelta(hours=24)
        self.workspace_token_ttl = timedelta(hours=12)
        self.api_token_ttl = timedelta(days=30)
        self.exchange_token_ttl = timedelta(minutes=5)

    @property
    def redis_client(self):
        """Get Redis client instance."""
        if self._redis_client is None:
            self._redis_client = redis.from_url(
                self.settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
        return self._redis_client

    def _derive_encryption_key(self) -> bytes:
        """Derive encryption key from JWT secret."""
        # Use PBKDF2 to derive a proper encryption key
        import hashlib
        import os

        salt = b'parlant_token_salt'  # In production, use a proper random salt
        key = hashlib.pbkdf2_hmac(
            'sha256',
            self.settings.jwt_secret_key.encode(),
            salt,
            100000,  # iterations
            32  # key length
        )
        return key

    async def create_session_token(
        self,
        session: SimSession,
        workspace_id: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> SessionToken:
        """Create a secure session token for Parlant integration."""

        token_id = self._generate_token_id()
        now = datetime.utcnow()
        expires_at = now + self.session_token_ttl

        # Create token payload
        payload = {
            "jti": token_id,
            "type": TokenType.SESSION_TOKEN.value,
            "user_id": session.user.id,
            "user_email": session.user.email,
            "user_name": session.user.name,
            "session_id": session.id,
            "workspace_id": workspace_id,
            "permissions": permissions or [],
            "iat": now.timestamp(),
            "exp": expires_at.timestamp(),
            "iss": "sim-parlant-bridge",
            "aud": "parlant-server"
        }

        # Encrypt sensitive data
        fernet = Fernet(self._encryption_key)
        encrypted_payload = fernet.encrypt(json.dumps(payload).encode())

        # Create JWT token
        token = jwt.encode(
            {"jti": token_id, "type": "encrypted_session"},
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm
        )

        # Create signature for integrity
        signature = self._create_token_signature(token, encrypted_payload)

        session_token = SessionToken(
            token=token,
            encrypted_payload=encrypted_payload.decode(),
            signature=signature,
            expires_at=expires_at
        )

        # Store token metadata in Redis
        await self._store_token_metadata(token_id, TokenMetadata(
            token_id=token_id,
            token_type=TokenType.SESSION_TOKEN,
            user_id=session.user.id,
            workspace_id=workspace_id,
            issued_at=now,
            expires_at=expires_at,
            permissions=permissions or [],
            metadata={
                "session_id": session.id,
                "user_email": session.user.email,
                "ip_address": session.ip_address
            }
        ))

        logger.info(f"Created session token for user {session.user.email}")
        return session_token

    async def validate_session_token(self, session_token: SessionToken) -> Optional[Dict[str, Any]]:
        """Validate and decrypt a session token."""

        try:
            # Verify JWT token
            token_data = jwt.decode(
                session_token.token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm]
            )

            token_id = token_data.get("jti")
            if not token_id:
                return None

            # Check token metadata in Redis
            metadata = await self._get_token_metadata(token_id)
            if not metadata or metadata.expires_at < datetime.utcnow():
                return None

            # Verify signature
            expected_signature = self._create_token_signature(
                session_token.token,
                session_token.encrypted_payload.encode()
            )

            if not secrets.compare_digest(session_token.signature, expected_signature):
                logger.warning(f"Token signature verification failed for token {token_id}")
                return None

            # Decrypt payload
            fernet = Fernet(self._encryption_key)
            decrypted_payload = fernet.decrypt(session_token.encrypted_payload.encode())
            payload = json.loads(decrypted_payload.decode())

            logger.debug(f"Validated session token for user {payload.get('user_id')}")
            return payload

        except (JWTError, Exception) as e:
            logger.error(f"Error validating session token: {e}")
            return None

    async def create_workspace_token(
        self,
        session: SimSession,
        workspace_id: str,
        permissions: List[str]
    ) -> str:
        """Create a workspace-scoped token."""

        token_id = self._generate_token_id()
        now = datetime.utcnow()
        expires_at = now + self.workspace_token_ttl

        payload = {
            "jti": token_id,
            "type": TokenType.WORKSPACE_TOKEN.value,
            "user_id": session.user.id,
            "workspace_id": workspace_id,
            "permissions": permissions,
            "iat": now.timestamp(),
            "exp": expires_at.timestamp(),
            "iss": "sim-parlant-bridge",
            "aud": "parlant-server"
        }

        token = jwt.encode(
            payload,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm
        )

        # Store token metadata
        await self._store_token_metadata(token_id, TokenMetadata(
            token_id=token_id,
            token_type=TokenType.WORKSPACE_TOKEN,
            user_id=session.user.id,
            workspace_id=workspace_id,
            issued_at=now,
            expires_at=expires_at,
            permissions=permissions,
            metadata={"session_id": session.id}
        ))

        logger.info(f"Created workspace token for user {session.user.email}")
        return token

    async def create_exchange_token(
        self,
        session: SimSession,
        target_service: str,
        scope: List[str]
    ) -> str:
        """Create a short-lived exchange token for service-to-service auth."""

        token_id = self._generate_token_id()
        now = datetime.utcnow()
        expires_at = now + self.exchange_token_ttl

        payload = {
            "jti": token_id,
            "type": TokenType.EXCHANGE_TOKEN.value,
            "user_id": session.user.id,
            "target_service": target_service,
            "scope": scope,
            "iat": now.timestamp(),
            "exp": expires_at.timestamp(),
            "iss": "sim-parlant-bridge",
            "aud": target_service
        }

        token = jwt.encode(
            payload,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm
        )

        # Store with short TTL
        await self._store_token_metadata(token_id, TokenMetadata(
            token_id=token_id,
            token_type=TokenType.EXCHANGE_TOKEN,
            user_id=session.user.id,
            workspace_id=None,
            issued_at=now,
            expires_at=expires_at,
            permissions=scope,
            metadata={"target_service": target_service}
        ))

        logger.info(f"Created exchange token for user {session.user.email}")
        return token

    async def revoke_token(self, token_id: str, user_id: str) -> bool:
        """Revoke a token."""

        try:
            # Get token metadata
            metadata = await self._get_token_metadata(token_id)
            if not metadata:
                return False

            # Verify user owns the token
            if metadata.user_id != user_id:
                logger.warning(f"User {user_id} attempted to revoke token {token_id} owned by {metadata.user_id}")
                return False

            # Remove from Redis
            await self._delete_token_metadata(token_id)

            logger.info(f"Revoked token {token_id} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error revoking token {token_id}: {e}")
            return False

    async def refresh_session_token(
        self,
        current_token: SessionToken,
        session: SimSession
    ) -> Optional[SessionToken]:
        """Refresh a session token if it's close to expiry."""

        # Validate current token
        payload = await self.validate_session_token(current_token)
        if not payload:
            return None

        # Check if refresh is needed (less than 2 hours remaining)
        time_remaining = current_token.expires_at - datetime.utcnow()
        if time_remaining > timedelta(hours=2):
            return current_token

        # Create new token
        workspace_id = payload.get("workspace_id")
        permissions = payload.get("permissions", [])

        new_token = await self.create_session_token(session, workspace_id, permissions)

        # Revoke old token
        await self.revoke_token(payload["jti"], session.user.id)

        logger.info(f"Refreshed session token for user {session.user.email}")
        return new_token

    async def get_active_tokens(self, user_id: str) -> List[TokenMetadata]:
        """Get list of active tokens for a user."""

        try:
            # In production, this would use a more efficient pattern scan
            pattern = f"{self.settings.redis_key_prefix}token:*"
            keys = self.redis_client.keys(pattern)

            active_tokens = []
            for key in keys:
                try:
                    data = self.redis_client.get(key)
                    if data:
                        metadata = TokenMetadata(**json.loads(data))
                        if metadata.user_id == user_id and metadata.expires_at > datetime.utcnow():
                            active_tokens.append(metadata)
                except Exception as e:
                    logger.warning(f"Error parsing token metadata from {key}: {e}")

            return active_tokens

        except Exception as e:
            logger.error(f"Error getting active tokens for user {user_id}: {e}")
            return []

    # Private helper methods

    def _generate_token_id(self) -> str:
        """Generate a unique token identifier."""
        return secrets.token_urlsafe(32)

    def _create_token_signature(self, token: str, encrypted_payload: bytes) -> str:
        """Create HMAC signature for token integrity."""
        import hmac

        message = f"{token}:{encrypted_payload.decode()}"
        signature = hmac.new(
            self.settings.jwt_secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        return signature

    async def _store_token_metadata(self, token_id: str, metadata: TokenMetadata):
        """Store token metadata in Redis."""
        key = f"{self.settings.redis_key_prefix}token:{token_id}"
        ttl_seconds = int((metadata.expires_at - datetime.utcnow()).total_seconds())

        self.redis_client.setex(
            key,
            ttl_seconds,
            json.dumps(asdict(metadata), default=str)
        )

    async def _get_token_metadata(self, token_id: str) -> Optional[TokenMetadata]:
        """Get token metadata from Redis."""
        key = f"{self.settings.redis_key_prefix}token:{token_id}"
        data = self.redis_client.get(key)

        if data:
            try:
                metadata_dict = json.loads(data)
                # Convert datetime strings back to datetime objects
                metadata_dict['issued_at'] = datetime.fromisoformat(metadata_dict['issued_at'])
                metadata_dict['expires_at'] = datetime.fromisoformat(metadata_dict['expires_at'])
                metadata_dict['token_type'] = TokenType(metadata_dict['token_type'])
                return TokenMetadata(**metadata_dict)
            except Exception as e:
                logger.error(f"Error parsing token metadata: {e}")
                return None

        return None

    async def _delete_token_metadata(self, token_id: str):
        """Delete token metadata from Redis."""
        key = f"{self.settings.redis_key_prefix}token:{token_id}"
        self.redis_client.delete(key)


class SessionConsistencyManager:
    """Manages session consistency between Sim and Parlant."""

    def __init__(self, token_service: TokenExchangeService):
        self.token_service = token_service
        self.redis_client = token_service.redis_client

    async def sync_session_state(
        self,
        sim_session: SimSession,
        parlant_session_id: str,
        context_data: Dict[str, Any]
    ):
        """Synchronize session state between Sim and Parlant."""

        sync_data = {
            "sim_session_id": sim_session.id,
            "parlant_session_id": parlant_session_id,
            "user_id": sim_session.user.id,
            "context_data": context_data,
            "last_sync": datetime.utcnow().isoformat(),
            "expires_at": sim_session.expires_at.isoformat()
        }

        key = f"{self.token_service.settings.redis_key_prefix}session_sync:{sim_session.id}"
        ttl_seconds = int((sim_session.expires_at - datetime.utcnow()).total_seconds())

        self.redis_client.setex(
            key,
            ttl_seconds,
            json.dumps(sync_data)
        )

        logger.debug(f"Synced session state for session {sim_session.id}")

    async def get_session_sync_data(self, sim_session_id: str) -> Optional[Dict[str, Any]]:
        """Get synchronized session data."""

        key = f"{self.token_service.settings.redis_key_prefix}session_sync:{sim_session_id}"
        data = self.redis_client.get(key)

        if data:
            return json.loads(data)

        return None

    async def invalidate_session(self, session_id: str):
        """Invalidate session across both systems."""

        # Remove session sync data
        sync_key = f"{self.token_service.settings.redis_key_prefix}session_sync:{session_id}"
        self.redis_client.delete(sync_key)

        # Revoke associated tokens
        pattern = f"{self.token_service.settings.redis_key_prefix}token:*"
        keys = self.redis_client.keys(pattern)

        for key in keys:
            try:
                data = self.redis_client.get(key)
                if data:
                    metadata = json.loads(data)
                    if metadata.get("metadata", {}).get("session_id") == session_id:
                        self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"Error checking token for session invalidation: {e}")

        logger.info(f"Invalidated session {session_id}")


# Global instances
_token_service: Optional[TokenExchangeService] = None
_session_consistency_manager: Optional[SessionConsistencyManager] = None


def get_token_service() -> TokenExchangeService:
    """Get or create global token service instance."""
    global _token_service
    if _token_service is None:
        _token_service = TokenExchangeService()
    return _token_service


def get_session_consistency_manager() -> SessionConsistencyManager:
    """Get or create global session consistency manager."""
    global _session_consistency_manager
    if _session_consistency_manager is None:
        token_service = get_token_service()
        _session_consistency_manager = SessionConsistencyManager(token_service)
    return _session_consistency_manager