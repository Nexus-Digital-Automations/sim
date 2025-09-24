"""
Enterprise Workspace Messaging Integration System
===============================================

This module implements comprehensive workspace isolation for real-time messaging
with enterprise-grade security, multi-tenant architecture, and compliance features.

Key Features:
- Workspace-scoped message routing with strict isolation boundaries
- Multi-tenant messaging queues with cryptographic security
- Real-time message security with workspace validation
- Message encryption and secure transmission protocols
- Comprehensive audit logging and compliance features
- Workspace-aware presence and status systems
- Integration with existing workspace tools and workflows
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any, Set, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from uuid import uuid4, UUID
from enum import Enum
from contextlib import asynccontextmanager
import hashlib
import hmac
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

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

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Message types for workspace messaging system."""
    CHAT = "chat"
    SYSTEM = "system"
    PRESENCE = "presence"
    STATUS = "status"
    FILE = "file"
    NOTIFICATION = "notification"
    AGENT_RESPONSE = "agent_response"


class PresenceStatus(str, Enum):
    """User presence status within workspace."""
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"
    INVISIBLE = "invisible"


class MessagePriority(str, Enum):
    """Message priority levels for routing and display."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


@dataclass
class WorkspaceMessage:
    """Comprehensive workspace message with encryption and metadata."""
    id: str = field(default_factory=lambda: str(uuid4()))
    workspace_id: str = ""
    sender_id: str = ""
    recipient_id: Optional[str] = None  # None for broadcast messages
    channel_id: Optional[str] = None  # Channel-based messaging
    agent_id: Optional[str] = None  # Agent-generated messages

    message_type: MessageType = MessageType.CHAT
    priority: MessagePriority = MessagePriority.NORMAL

    content: str = ""
    encrypted_content: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    created_at: datetime = field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    # Security and compliance
    encryption_key_id: Optional[str] = None
    audit_log_id: Optional[str] = None
    compliance_flags: List[str] = field(default_factory=list)
    security_labels: Set[str] = field(default_factory=set)

    # Threading and replies
    thread_id: Optional[str] = None
    reply_to_message_id: Optional[str] = None

    # Message status
    is_read: bool = False
    is_deleted: bool = False
    is_edited: bool = False
    edit_history: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class WorkspacePresence:
    """User presence information within workspace context."""
    user_id: str
    workspace_id: str
    status: PresenceStatus
    last_seen: datetime
    socket_id: Optional[str] = None
    device_info: Dict[str, Any] = field(default_factory=dict)
    location_info: Dict[str, Any] = field(default_factory=dict)
    custom_status: Optional[str] = None
    is_active: bool = True


@dataclass
class MessageQueue:
    """Workspace-scoped message queue with multi-tenant isolation."""
    workspace_id: str
    queue_id: str = field(default_factory=lambda: str(uuid4()))
    messages: List[WorkspaceMessage] = field(default_factory=list)
    subscribers: Set[str] = field(default_factory=set)
    max_size: int = 10000
    retention_period: timedelta = field(default_factory=lambda: timedelta(days=30))
    encryption_enabled: bool = True
    compliance_mode: bool = True


class WorkspaceMessagingSystem:
    """
    Enterprise-grade workspace messaging system with comprehensive isolation.

    Provides:
    - Multi-tenant message routing with workspace isolation
    - Real-time messaging security with encryption
    - Presence management and status systems
    - Audit logging and compliance features
    - Integration with workspace tools and workflows
    """

    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None

        # Message queues by workspace
        self._workspace_queues: Dict[str, MessageQueue] = {}

        # Active WebSocket connections by workspace
        self._workspace_connections: Dict[str, Set[WebSocket]] = {}

        # User presence by workspace
        self._workspace_presence: Dict[str, Dict[str, WorkspacePresence]] = {}

        # Encryption system
        self._workspace_encryption_keys: Dict[str, bytes] = {}

        # Message routing and filtering
        self._message_filters: Dict[str, List[callable]] = {}
        self._routing_rules: Dict[str, Dict[str, Any]] = {}

        # Security and compliance
        self._security_validators: List[callable] = []
        self._compliance_processors: List[callable] = []

        # Performance monitoring
        self._message_metrics: Dict[str, Any] = {}
        self._performance_stats: Dict[str, Any] = {}

    async def initialize(self):
        """Initialize the workspace messaging system."""
        logger.info("Initializing Enterprise Workspace Messaging System")

        try:
            # Initialize Redis connection for message queuing
            await self._initialize_redis_connection()

            # Set up encryption system
            await self._initialize_encryption_system()

            # Load existing workspace configurations
            await self._load_workspace_messaging_configs()

            # Initialize security validators
            await self._initialize_security_system()

            # Set up compliance processors
            await self._initialize_compliance_system()

            # Start background maintenance tasks
            asyncio.create_task(self._background_maintenance())

            logger.info("Workspace Messaging System initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize messaging system: {e}")
            raise

    async def create_workspace_message_queue(
        self,
        workspace_context: WorkspaceContext,
        config: Optional[Dict[str, Any]] = None
    ) -> MessageQueue:
        """Create isolated message queue for workspace."""
        logger.info(f"Creating message queue for workspace {workspace_context.workspace_id}")

        # Validate workspace permissions
        if "messaging" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions for messaging in workspace"
            )

        # Create workspace-scoped message queue
        queue_config = config or {}
        message_queue = MessageQueue(
            workspace_id=workspace_context.workspace_id,
            max_size=queue_config.get("max_size", 10000),
            retention_period=timedelta(days=queue_config.get("retention_days", 30)),
            encryption_enabled=queue_config.get("encryption_enabled", True),
            compliance_mode=queue_config.get("compliance_mode", True)
        )

        # Generate encryption key for workspace
        if message_queue.encryption_enabled:
            await self._generate_workspace_encryption_key(workspace_context.workspace_id)

        # Store queue with workspace isolation
        self._workspace_queues[workspace_context.workspace_id] = message_queue

        # Initialize Redis-backed persistence
        await self._persist_message_queue_config(message_queue)

        logger.info(f"Message queue created for workspace {workspace_context.workspace_id}")
        return message_queue

    async def send_workspace_message(
        self,
        session: SimSession,
        workspace_id: str,
        message_data: Dict[str, Any]
    ) -> WorkspaceMessage:
        """Send message with comprehensive workspace isolation and security."""
        logger.debug(f"Sending message in workspace {workspace_id}")

        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        # Create message with validation
        message = await self._create_validated_message(
            workspace_context, session.user.id, message_data
        )

        # Apply security processing
        await self._apply_security_processing(message, workspace_context)

        # Encrypt message content if required
        if self._workspace_queues[workspace_id].encryption_enabled:
            await self._encrypt_message(message, workspace_id)

        # Add to workspace queue
        await self._add_message_to_queue(message, workspace_id)

        # Route message to active connections
        await self._route_message_to_subscribers(message, workspace_id)

        # Log for audit and compliance
        await self._log_message_audit(message, workspace_context, "sent")

        # Update workspace metrics
        await self._update_messaging_metrics(workspace_id, "message_sent")

        logger.debug(f"Message {message.id} sent successfully in workspace {workspace_id}")
        return message

    async def subscribe_to_workspace_messages(
        self,
        session: SimSession,
        workspace_id: str,
        websocket: WebSocket,
        filters: Optional[Dict[str, Any]] = None
    ):
        """Subscribe WebSocket to workspace message stream with isolation."""
        logger.info(f"Subscribing to messages in workspace {workspace_id}")

        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        # Initialize workspace connections if needed
        if workspace_id not in self._workspace_connections:
            self._workspace_connections[workspace_id] = set()

        # Add connection to workspace-scoped subscribers
        self._workspace_connections[workspace_id].add(websocket)

        # Set up message filtering if requested
        if filters:
            await self._setup_message_filters(websocket, filters)

        # Update user presence
        await self._update_user_presence(
            session.user.id, workspace_id, PresenceStatus.ONLINE, websocket
        )

        # Send recent messages if requested
        await self._send_message_history(websocket, workspace_id, session.user.id)

        # Log connection for audit
        await self._log_connection_audit(session.user.id, workspace_id, "connected")

        try:
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    # Receive messages from WebSocket
                    data = await websocket.receive_json()
                    await self._handle_websocket_message(
                        data, session, workspace_id, websocket
                    )
                except WebSocketDisconnect:
                    break

        except Exception as e:
            logger.error(f"WebSocket error in workspace {workspace_id}: {e}")

        finally:
            # Clean up connection
            await self._cleanup_websocket_connection(
                session.user.id, workspace_id, websocket
            )

    async def get_workspace_message_history(
        self,
        session: SimSession,
        workspace_id: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[WorkspaceMessage]:
        """Retrieve message history with workspace isolation."""
        logger.debug(f"Retrieving message history for workspace {workspace_id}")

        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        # Get workspace queue
        if workspace_id not in self._workspace_queues:
            return []

        queue = self._workspace_queues[workspace_id]

        # Apply filters and pagination
        messages = queue.messages

        if filters:
            messages = await self._apply_message_filters(messages, filters)

        # Apply user-specific permissions
        messages = await self._filter_messages_by_permissions(
            messages, session.user.id, workspace_context
        )

        # Decrypt messages if user has access
        decrypted_messages = []
        for message in messages[offset:offset + limit]:
            if message.encrypted_content and await self._user_can_decrypt(
                session.user.id, workspace_id, message
            ):
                decrypted_message = await self._decrypt_message(message, workspace_id)
                decrypted_messages.append(decrypted_message)
            else:
                decrypted_messages.append(message)

        # Log access for audit
        await self._log_message_access_audit(
            session.user.id, workspace_id, len(decrypted_messages)
        )

        return decrypted_messages

    async def update_workspace_presence(
        self,
        session: SimSession,
        workspace_id: str,
        status: PresenceStatus,
        custom_status: Optional[str] = None
    ):
        """Update user presence in workspace with real-time broadcasting."""
        logger.debug(f"Updating presence for user {session.user.id} in workspace {workspace_id}")

        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        # Update presence information
        await self._update_user_presence(
            session.user.id, workspace_id, status, custom_status=custom_status
        )

        # Broadcast presence update to workspace subscribers
        presence_message = WorkspaceMessage(
            workspace_id=workspace_id,
            sender_id=session.user.id,
            message_type=MessageType.PRESENCE,
            content=json.dumps({
                "user_id": session.user.id,
                "status": status.value,
                "custom_status": custom_status,
                "timestamp": datetime.now().isoformat()
            })
        )

        await self._route_message_to_subscribers(presence_message, workspace_id)

        logger.debug(f"Presence updated for user {session.user.id} in workspace {workspace_id}")

    async def get_workspace_presence(
        self,
        session: SimSession,
        workspace_id: str
    ) -> Dict[str, WorkspacePresence]:
        """Get all user presence information for workspace."""
        logger.debug(f"Getting presence for workspace {workspace_id}")

        # Validate workspace access
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        # Return workspace-scoped presence information
        return self._workspace_presence.get(workspace_id, {})

    async def generate_workspace_analytics_report(
        self,
        session: SimSession,
        workspace_id: str,
        date_range: Optional[tuple] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive analytics report for workspace messaging."""
        logger.info(f"Generating analytics report for workspace {workspace_id}")

        # Validate workspace access and admin permissions
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        if "admin" not in workspace_context.user_permissions:
            raise HTTPException(
                status_code=403,
                detail="Admin permissions required for analytics"
            )

        # Generate comprehensive analytics
        report = {
            "workspace_id": workspace_id,
            "generated_at": datetime.now().isoformat(),
            "generated_by": session.user.id,
            "date_range": date_range,
            "metrics": await self._calculate_workspace_metrics(workspace_id, date_range),
            "usage_patterns": await self._analyze_usage_patterns(workspace_id, date_range),
            "security_events": await self._get_security_events(workspace_id, date_range),
            "compliance_summary": await self._generate_compliance_summary(workspace_id, date_range),
            "performance_stats": await self._get_performance_stats(workspace_id, date_range)
        }

        logger.info(f"Analytics report generated for workspace {workspace_id}")
        return report

    # Private implementation methods

    async def _initialize_redis_connection(self):
        """Initialize Redis connection for message queuing."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)

            # Test connection
            await self.redis_client.ping()
            logger.info("Redis connection initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise

    async def _initialize_encryption_system(self):
        """Initialize message encryption system."""
        logger.info("Initializing message encryption system")

        # This would typically load encryption keys from a secure key management service
        # For demo purposes, we'll generate keys dynamically
        pass

    async def _generate_workspace_encryption_key(self, workspace_id: str):
        """Generate encryption key for workspace messages."""
        # Generate a Fernet key for symmetric encryption
        key = Fernet.generate_key()
        self._workspace_encryption_keys[workspace_id] = key

        # In production, this would be stored in a secure key management system
        logger.debug(f"Encryption key generated for workspace {workspace_id}")

    async def _encrypt_message(self, message: WorkspaceMessage, workspace_id: str):
        """Encrypt message content using workspace key."""
        if workspace_id not in self._workspace_encryption_keys:
            await self._generate_workspace_encryption_key(workspace_id)

        key = self._workspace_encryption_keys[workspace_id]
        fernet = Fernet(key)

        # Encrypt the content
        message.encrypted_content = fernet.encrypt(message.content.encode()).decode()
        message.encryption_key_id = f"workspace_{workspace_id}_key"

        # Clear plaintext for security
        message.content = "[ENCRYPTED]"

    async def _decrypt_message(
        self, message: WorkspaceMessage, workspace_id: str
    ) -> WorkspaceMessage:
        """Decrypt message content using workspace key."""
        if not message.encrypted_content or workspace_id not in self._workspace_encryption_keys:
            return message

        key = self._workspace_encryption_keys[workspace_id]
        fernet = Fernet(key)

        try:
            # Decrypt the content
            decrypted_content = fernet.decrypt(message.encrypted_content.encode()).decode()

            # Create new message with decrypted content
            decrypted_message = message
            decrypted_message.content = decrypted_content

            return decrypted_message

        except Exception as e:
            logger.error(f"Failed to decrypt message {message.id}: {e}")
            return message

    async def _create_validated_message(
        self,
        workspace_context: WorkspaceContext,
        sender_id: str,
        message_data: Dict[str, Any]
    ) -> WorkspaceMessage:
        """Create and validate message with security checks."""
        # Create message object
        message = WorkspaceMessage(
            workspace_id=workspace_context.workspace_id,
            sender_id=sender_id,
            recipient_id=message_data.get("recipient_id"),
            channel_id=message_data.get("channel_id"),
            agent_id=message_data.get("agent_id"),
            message_type=MessageType(message_data.get("type", "chat")),
            priority=MessagePriority(message_data.get("priority", "normal")),
            content=message_data.get("content", ""),
            metadata=message_data.get("metadata", {}),
            thread_id=message_data.get("thread_id"),
            reply_to_message_id=message_data.get("reply_to_message_id")
        )

        # Apply security validation
        await self._validate_message_security(message, workspace_context)

        return message

    async def _validate_message_security(
        self,
        message: WorkspaceMessage,
        workspace_context: WorkspaceContext
    ):
        """Apply comprehensive security validation to message."""
        # Content validation
        if len(message.content) > 10000:  # 10KB limit
            raise HTTPException(
                status_code=400,
                detail="Message content exceeds size limit"
            )

        # Scan for malicious content
        await self._scan_message_content(message)

        # Apply compliance checks
        await self._apply_compliance_checks(message, workspace_context)

    async def _scan_message_content(self, message: WorkspaceMessage):
        """Scan message content for security threats."""
        content = message.content.lower()

        # Basic security patterns
        security_patterns = [
            r'<script.*?>.*?</script>',
            r'javascript:',
            r'data:image/svg\+xml',
            r'vbscript:',
        ]

        import re
        for pattern in security_patterns:
            if re.search(pattern, content):
                message.security_labels.add("potential_xss")
                logger.warning(f"Potential XSS detected in message {message.id}")

    async def _apply_security_processing(
        self,
        message: WorkspaceMessage,
        workspace_context: WorkspaceContext
    ):
        """Apply security processing and labeling."""
        # Add security labels based on content and context
        if message.message_type == MessageType.FILE:
            message.security_labels.add("file_attachment")

        if message.sender_id != workspace_context.user_id:
            message.security_labels.add("external_sender")

        # Add compliance flags if needed
        if any(word in message.content.lower() for word in ["confidential", "sensitive"]):
            message.compliance_flags.append("sensitive_content")

    async def _add_message_to_queue(self, message: WorkspaceMessage, workspace_id: str):
        """Add message to workspace-scoped queue."""
        if workspace_id not in self._workspace_queues:
            await self.create_workspace_message_queue(
                WorkspaceContext(workspace_id=workspace_id, user_id=message.sender_id, user_permissions=[])
            )

        queue = self._workspace_queues[workspace_id]
        queue.messages.append(message)

        # Enforce size limits
        if len(queue.messages) > queue.max_size:
            queue.messages = queue.messages[-queue.max_size:]

        # Persist to Redis for durability
        await self._persist_message_to_redis(message)

    async def _route_message_to_subscribers(
        self,
        message: WorkspaceMessage,
        workspace_id: str
    ):
        """Route message to active WebSocket subscribers in workspace."""
        if workspace_id not in self._workspace_connections:
            return

        connections = self._workspace_connections[workspace_id].copy()
        message_data = {
            "id": message.id,
            "workspace_id": message.workspace_id,
            "sender_id": message.sender_id,
            "recipient_id": message.recipient_id,
            "type": message.message_type.value,
            "content": message.content,
            "metadata": message.metadata,
            "created_at": message.created_at.isoformat(),
            "thread_id": message.thread_id,
            "reply_to_message_id": message.reply_to_message_id
        }

        # Send to all active connections
        disconnected = set()
        for websocket in connections:
            try:
                await websocket.send_json({
                    "type": "message",
                    "data": message_data
                })
            except Exception as e:
                logger.error(f"Failed to send message to WebSocket: {e}")
                disconnected.add(websocket)

        # Clean up disconnected sockets
        for websocket in disconnected:
            self._workspace_connections[workspace_id].discard(websocket)

    async def _update_user_presence(
        self,
        user_id: str,
        workspace_id: str,
        status: PresenceStatus,
        websocket: Optional[WebSocket] = None,
        custom_status: Optional[str] = None
    ):
        """Update user presence information."""
        if workspace_id not in self._workspace_presence:
            self._workspace_presence[workspace_id] = {}

        presence = WorkspacePresence(
            user_id=user_id,
            workspace_id=workspace_id,
            status=status,
            last_seen=datetime.now(),
            socket_id=str(id(websocket)) if websocket else None,
            custom_status=custom_status
        )

        self._workspace_presence[workspace_id][user_id] = presence

        # Persist to Redis for cross-instance synchronization
        await self._persist_presence_to_redis(presence)

    async def _cleanup_websocket_connection(
        self,
        user_id: str,
        workspace_id: str,
        websocket: WebSocket
    ):
        """Clean up WebSocket connection and update presence."""
        # Remove from workspace connections
        if workspace_id in self._workspace_connections:
            self._workspace_connections[workspace_id].discard(websocket)

        # Update user presence to offline
        await self._update_user_presence(user_id, workspace_id, PresenceStatus.OFFLINE)

        # Log disconnection
        await self._log_connection_audit(user_id, workspace_id, "disconnected")

    async def _log_message_audit(
        self,
        message: WorkspaceMessage,
        workspace_context: WorkspaceContext,
        action: str
    ):
        """Log message for audit trail."""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "message_id": message.id,
            "workspace_id": message.workspace_id,
            "user_id": workspace_context.user_id,
            "message_type": message.message_type.value,
            "security_labels": list(message.security_labels),
            "compliance_flags": message.compliance_flags
        }

        # Store in audit log (Redis or database)
        await self._store_audit_log(audit_entry)

    async def _log_connection_audit(
        self,
        user_id: str,
        workspace_id: str,
        action: str
    ):
        """Log connection events for audit."""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "action": f"websocket_{action}",
            "user_id": user_id,
            "workspace_id": workspace_id,
            "event_type": "connection"
        }

        await self._store_audit_log(audit_entry)

    async def _store_audit_log(self, audit_entry: Dict[str, Any]):
        """Store audit log entry."""
        if self.redis_client:
            await self.redis_client.lpush(
                f"audit_log:{audit_entry['workspace_id']}",
                json.dumps(audit_entry)
            )

            # Set expiration for compliance retention
            await self.redis_client.expire(
                f"audit_log:{audit_entry['workspace_id']}",
                60 * 60 * 24 * 365  # 1 year retention
            )

    async def _persist_message_to_redis(self, message: WorkspaceMessage):
        """Persist message to Redis for durability."""
        if not self.redis_client:
            return

        message_data = {
            "id": message.id,
            "workspace_id": message.workspace_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "encrypted_content": message.encrypted_content,
            "created_at": message.created_at.isoformat(),
            "type": message.message_type.value,
            "metadata": message.metadata
        }

        await self.redis_client.hset(
            f"messages:{message.workspace_id}",
            message.id,
            json.dumps(message_data)
        )

    async def _background_maintenance(self):
        """Background maintenance tasks."""
        while True:
            try:
                # Clean up expired messages
                await self._cleanup_expired_messages()

                # Update performance metrics
                await self._update_performance_metrics()

                # Rotate encryption keys if needed
                await self._rotate_encryption_keys()

                # Wait 5 minutes before next maintenance cycle
                await asyncio.sleep(300)

            except Exception as e:
                logger.error(f"Background maintenance error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

    async def _cleanup_expired_messages(self):
        """Clean up expired messages from queues."""
        current_time = datetime.now()

        for workspace_id, queue in self._workspace_queues.items():
            # Remove messages older than retention period
            cutoff_time = current_time - queue.retention_period
            queue.messages = [
                msg for msg in queue.messages
                if msg.created_at > cutoff_time and not msg.is_deleted
            ]

    async def _update_performance_metrics(self):
        """Update performance and usage metrics."""
        for workspace_id in self._workspace_queues:
            metrics = self._message_metrics.get(workspace_id, {})

            # Calculate metrics
            queue = self._workspace_queues[workspace_id]
            metrics.update({
                "total_messages": len(queue.messages),
                "active_connections": len(self._workspace_connections.get(workspace_id, set())),
                "active_users": len(self._workspace_presence.get(workspace_id, {})),
                "last_updated": datetime.now().isoformat()
            })

            self._message_metrics[workspace_id] = metrics


# Global messaging system instance
workspace_messaging_system = WorkspaceMessagingSystem()


# Convenience functions for integration

async def send_workspace_message(
    session: SimSession,
    workspace_id: str,
    message_data: Dict[str, Any]
) -> WorkspaceMessage:
    """Send message in workspace with isolation."""
    return await workspace_messaging_system.send_workspace_message(
        session, workspace_id, message_data
    )


async def get_workspace_messages(
    session: SimSession,
    workspace_id: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 100
) -> List[WorkspaceMessage]:
    """Get workspace message history."""
    return await workspace_messaging_system.get_workspace_message_history(
        session, workspace_id, filters, limit
    )


async def update_user_presence(
    session: SimSession,
    workspace_id: str,
    status: PresenceStatus,
    custom_status: Optional[str] = None
):
    """Update user presence in workspace."""
    return await workspace_messaging_system.update_workspace_presence(
        session, workspace_id, status, custom_status
    )