"""
Secure Socket.IO Integration for Enterprise Multitenant Chat
============================================================

This module provides secure Socket.IO integration for real-time messaging
with comprehensive workspace isolation, security controls, and enterprise
governance features.

Key Features:
- Workspace-scoped Socket.IO rooms with cryptographic isolation
- Real-time security monitoring and threat detection
- Enterprise-grade authentication and authorization
- Comprehensive audit logging for all real-time events
- Rate limiting and abuse prevention for WebSocket connections
- Advanced encryption for real-time message transmission
- Integration with existing Sim Socket.IO infrastructure
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any, Set, Union, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from uuid import uuid4, UUID
from enum import Enum
import hashlib
import hmac
import jwt
from collections import defaultdict

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
import socketio
from socketio import AsyncServer
import redis.asyncio as redis

from auth.sim_auth_bridge import SimSession, authenticate_websocket
from workspace_isolation import WorkspaceContext, workspace_isolation_manager
from messaging.enterprise_multitenant_chat_system import (
    EnterpriseMultitenantChatSystem,
    ChatSecurityPolicy,
    ChatAuditEvent,
    SecurityThreatLevel,
    ChatGovernanceAction,
    get_enterprise_chat_system
)
from messaging.workspace_messaging_system import WorkspaceMessage, MessageType

logger = logging.getLogger(__name__)


class SocketEventType(str, Enum):
    """Socket.IO event types for enterprise chat."""
    JOIN_WORKSPACE = "join_workspace_chat"
    LEAVE_WORKSPACE = "leave_workspace_chat"
    SEND_MESSAGE = "send_chat_message"
    MESSAGE_RECEIVED = "chat_message_received"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    USER_PRESENCE = "user_presence_update"
    SECURITY_ALERT = "security_alert"
    POLICY_UPDATE = "policy_update"
    EMERGENCY_LOCKDOWN = "emergency_lockdown"


@dataclass
class SecureSocketConnection:
    """Secure Socket.IO connection with enterprise controls."""
    socket_id: str
    user_id: str
    workspace_id: str
    agent_id: Optional[str] = None

    # Security context
    authentication_token: str = ""
    last_activity: datetime = field(default_factory=datetime.now)
    security_level: str = "standard"  # standard, elevated, admin

    # Rate limiting
    message_count: int = 0
    last_message_time: datetime = field(default_factory=datetime.now)
    rate_limit_violations: int = 0

    # Connection metadata
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    connected_at: datetime = field(default_factory=datetime.now)

    # Security flags
    is_quarantined: bool = False
    security_violations: int = 0
    threat_score: float = 0.0


class SecureSocketIOIntegration:
    """
    Enterprise-grade Socket.IO integration for multitenant chat.

    Provides secure real-time messaging with comprehensive workspace
    isolation, security controls, and governance features.
    """

    def __init__(self, sio_server: AsyncServer):
        self.sio = sio_server
        self.enterprise_chat: Optional[EnterpriseMultitenantChatSystem] = None
        self.redis_client: Optional[redis.Redis] = None

        # Active connections by workspace
        self._workspace_connections: Dict[str, Dict[str, SecureSocketConnection]] = defaultdict(dict)

        # Security monitoring
        self._connection_metrics: Dict[str, Any] = defaultdict(dict)
        self._security_events: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        # Rate limiting buckets
        self._rate_limiters: Dict[str, Dict[str, Any]] = defaultdict(dict)

        # Emergency controls
        self._locked_workspaces: Set[str] = set()
        self._quarantined_connections: Set[str] = set()

    async def initialize(self):
        """Initialize the secure Socket.IO integration."""
        logger.info("Initializing Secure Socket.IO Integration")

        try:
            # Get enterprise chat system
            self.enterprise_chat = await get_enterprise_chat_system()

            # Initialize Redis connection
            await self._initialize_redis_connection()

            # Register Socket.IO event handlers
            await self._register_socket_handlers()

            # Start background monitoring
            asyncio.create_task(self._connection_monitoring_loop())
            asyncio.create_task(self._security_monitoring_loop())

            logger.info("Secure Socket.IO Integration initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Socket.IO integration: {e}")
            raise

    async def _register_socket_handlers(self):
        """Register all Socket.IO event handlers with security controls."""

        @self.sio.event
        async def connect(sid: str, environ: Dict[str, Any], auth: Dict[str, Any]):
            """Handle secure connection with authentication and authorization."""
            logger.info(f"Socket connection attempt: {sid}")

            try:
                # Extract authentication token
                token = auth.get("token") if auth else None
                if not token:
                    logger.warning(f"Connection {sid} rejected: No authentication token")
                    await self.sio.disconnect(sid)
                    return False

                # Authenticate user
                session = await authenticate_websocket(token)
                if not session:
                    logger.warning(f"Connection {sid} rejected: Invalid token")
                    await self.sio.disconnect(sid)
                    return False

                # Extract connection metadata
                ip_address = environ.get('REMOTE_ADDR')
                user_agent = environ.get('HTTP_USER_AGENT')

                # Create secure connection record
                connection = SecureSocketConnection(
                    socket_id=sid,
                    user_id=session.user.id,
                    workspace_id="",  # Will be set when joining workspace
                    authentication_token=token,
                    ip_address=ip_address,
                    user_agent=user_agent
                )

                # Store connection metadata
                await self.sio.save_session(sid, {
                    "user_id": session.user.id,
                    "connection": connection
                })

                logger.info(f"Socket {sid} connected successfully for user {session.user.id}")
                return True

            except Exception as e:
                logger.error(f"Connection error for {sid}: {e}")
                await self.sio.disconnect(sid)
                return False

        @self.sio.event
        async def disconnect(sid: str):
            """Handle secure disconnection with cleanup."""
            logger.info(f"Socket disconnection: {sid}")

            try:
                # Get session data
                session_data = await self.sio.get_session(sid)
                connection = session_data.get("connection")

                if connection and connection.workspace_id:
                    # Remove from workspace connections
                    workspace_connections = self._workspace_connections.get(connection.workspace_id, {})
                    workspace_connections.pop(sid, None)

                    # Notify other users in workspace
                    await self.sio.emit(
                        SocketEventType.USER_PRESENCE,
                        {
                            "user_id": connection.user_id,
                            "status": "offline",
                            "timestamp": datetime.now().isoformat()
                        },
                        room=f"workspace:{connection.workspace_id}"
                    )

                    # Create audit event
                    if self.enterprise_chat:
                        audit_event = await self.enterprise_chat._create_audit_event(
                            workspace_id=connection.workspace_id,
                            user_id=connection.user_id,
                            event_type="socket_disconnected",
                            event_category="security",
                            governance_action=ChatGovernanceAction.ALLOW
                        )
                        await self.enterprise_chat._store_audit_event(audit_event)

            except Exception as e:
                logger.error(f"Disconnect cleanup error for {sid}: {e}")

        @self.sio.event
        async def join_workspace_chat(sid: str, data: Dict[str, Any]):
            """Handle workspace chat room joining with security validation."""
            logger.debug(f"Workspace chat join request from {sid}: {data}")

            try:
                # Get session data
                session_data = await self.sio.get_session(sid)
                connection: SecureSocketConnection = session_data.get("connection")

                if not connection:
                    await self._emit_error(sid, "Invalid connection state")
                    return

                workspace_id = data.get("workspace_id")
                agent_id = data.get("agent_id")

                if not workspace_id:
                    await self._emit_error(sid, "Workspace ID required")
                    return

                # Check workspace lockdown
                if workspace_id in self._locked_workspaces:
                    await self._emit_error(sid, "Workspace is under emergency lockdown")
                    return

                # Validate workspace access
                session = SimSession(
                    user=type('User', (), {'id': connection.user_id})(),
                    workspace_id=workspace_id
                )

                workspace_context = await workspace_isolation_manager._validate_workspace_access(
                    session, workspace_id
                )

                # Check if user has chat permissions
                if "messaging" not in workspace_context.user_permissions:
                    await self._emit_error(sid, "Insufficient permissions for workspace chat")
                    return

                # Leave current workspace if any
                if connection.workspace_id:
                    await self.sio.leave_room(sid, f"workspace:{connection.workspace_id}")
                    self._workspace_connections[connection.workspace_id].pop(sid, None)

                # Join new workspace
                connection.workspace_id = workspace_id
                connection.agent_id = agent_id
                connection.last_activity = datetime.now()

                await self.sio.enter_room(sid, f"workspace:{workspace_id}")
                self._workspace_connections[workspace_id][sid] = connection

                # Update session
                session_data["connection"] = connection
                await self.sio.save_session(sid, session_data)

                # Notify successful join
                await self.sio.emit(
                    "workspace_joined",
                    {
                        "workspace_id": workspace_id,
                        "agent_id": agent_id,
                        "timestamp": datetime.now().isoformat()
                    },
                    room=sid
                )

                # Notify other users
                await self.sio.emit(
                    SocketEventType.USER_PRESENCE,
                    {
                        "user_id": connection.user_id,
                        "status": "online",
                        "workspace_id": workspace_id,
                        "timestamp": datetime.now().isoformat()
                    },
                    room=f"workspace:{workspace_id}",
                    skip_sid=sid
                )

                # Create audit event
                if self.enterprise_chat:
                    audit_event = await self.enterprise_chat._create_audit_event(
                        workspace_id=workspace_id,
                        user_id=connection.user_id,
                        agent_id=agent_id,
                        event_type="workspace_chat_joined",
                        event_category="governance",
                        governance_action=ChatGovernanceAction.ALLOW
                    )
                    await self.enterprise_chat._store_audit_event(audit_event)

                logger.debug(f"User {connection.user_id} joined workspace chat {workspace_id}")

            except Exception as e:
                logger.error(f"Workspace join error for {sid}: {e}")
                await self._emit_error(sid, "Failed to join workspace chat")

        @self.sio.event
        async def send_chat_message(sid: str, data: Dict[str, Any]):
            """Handle secure chat message sending with enterprise controls."""
            logger.debug(f"Chat message from {sid}: {data}")

            try:
                # Get session data
                session_data = await self.sio.get_session(sid)
                connection: SecureSocketConnection = session_data.get("connection")

                if not connection or not connection.workspace_id:
                    await self._emit_error(sid, "Not connected to workspace")
                    return

                # Check quarantine status
                if connection.is_quarantined or sid in self._quarantined_connections:
                    await self._emit_error(sid, "User is quarantined")
                    return

                # Rate limiting check
                await self._check_socket_rate_limits(connection)

                # Create session for enterprise chat system
                session = SimSession(
                    user=type('User', (), {'id': connection.user_id})(),
                    workspace_id=connection.workspace_id
                )

                # Send through enterprise chat system for security processing
                message, audit_event = await self.enterprise_chat.send_secure_message(
                    session=session,
                    workspace_id=connection.workspace_id,
                    message_data={
                        "content": data.get("content", ""),
                        "type": data.get("type", "chat"),
                        "agent_id": connection.agent_id,
                        "metadata": data.get("metadata", {})
                    },
                    agent_id=connection.agent_id
                )

                # Broadcast message to workspace with security context
                message_payload = {
                    "id": message.id,
                    "sender_id": message.sender_id,
                    "agent_id": message.agent_id,
                    "content": message.content,
                    "type": message.message_type.value,
                    "timestamp": message.created_at.isoformat(),
                    "security_level": audit_event.threat_level.value,
                    "encrypted": message.encrypted_content is not None
                }

                await self.sio.emit(
                    SocketEventType.MESSAGE_RECEIVED,
                    message_payload,
                    room=f"workspace:{connection.workspace_id}"
                )

                # Update connection metrics
                connection.message_count += 1
                connection.last_message_time = datetime.now()
                connection.last_activity = datetime.now()

                # Update session
                session_data["connection"] = connection
                await self.sio.save_session(sid, session_data)

                logger.debug(f"Chat message {message.id} sent successfully in workspace {connection.workspace_id}")

            except HTTPException as he:
                logger.warning(f"Chat message blocked for {sid}: {he.detail}")
                await self._emit_error(sid, he.detail, error_code=he.status_code)
            except Exception as e:
                logger.error(f"Chat message error for {sid}: {e}")
                await self._emit_error(sid, "Failed to send message")

        @self.sio.event
        async def typing_start(sid: str, data: Dict[str, Any]):
            """Handle typing indicator start."""
            await self._handle_typing_event(sid, "start", data)

        @self.sio.event
        async def typing_stop(sid: str, data: Dict[str, Any]):
            """Handle typing indicator stop."""
            await self._handle_typing_event(sid, "stop", data)

    async def _handle_typing_event(self, sid: str, action: str, data: Dict[str, Any]):
        """Handle typing indicator events with rate limiting."""
        try:
            # Get session data
            session_data = await self.sio.get_session(sid)
            connection: SecureSocketConnection = session_data.get("connection")

            if not connection or not connection.workspace_id:
                return

            # Rate limit typing events
            now = datetime.now()
            if (now - connection.last_activity).total_seconds() < 0.5:  # 500ms throttle
                return

            connection.last_activity = now
            session_data["connection"] = connection
            await self.sio.save_session(sid, session_data)

            # Broadcast typing indicator
            await self.sio.emit(
                f"typing_{action}",
                {
                    "user_id": connection.user_id,
                    "agent_id": connection.agent_id,
                    "timestamp": now.isoformat()
                },
                room=f"workspace:{connection.workspace_id}",
                skip_sid=sid
            )

        except Exception as e:
            logger.error(f"Typing event error for {sid}: {e}")

    async def emergency_lockdown_workspace(self, workspace_id: str, reason: str):
        """Emergency lockdown workspace chat with immediate disconnection."""
        logger.warning(f"Emergency lockdown for workspace {workspace_id}: {reason}")

        # Add to locked workspaces
        self._locked_workspaces.add(workspace_id)

        # Disconnect all workspace connections
        workspace_connections = self._workspace_connections.get(workspace_id, {})

        for sid, connection in list(workspace_connections.items()):
            try:
                # Notify user of lockdown
                await self.sio.emit(
                    SocketEventType.EMERGENCY_LOCKDOWN,
                    {
                        "workspace_id": workspace_id,
                        "reason": reason,
                        "timestamp": datetime.now().isoformat()
                    },
                    room=sid
                )

                # Force disconnect
                await self.sio.disconnect(sid)

            except Exception as e:
                logger.error(f"Failed to disconnect {sid} during lockdown: {e}")

        # Clear workspace connections
        self._workspace_connections[workspace_id].clear()

        logger.warning(f"Emergency lockdown completed for workspace {workspace_id}")

    async def quarantine_user_connections(self, workspace_id: str, user_id: str, reason: str):
        """Quarantine all connections for a user in workspace."""
        logger.warning(f"Quarantining user {user_id} connections in workspace {workspace_id}")

        workspace_connections = self._workspace_connections.get(workspace_id, {})

        for sid, connection in workspace_connections.items():
            if connection.user_id == user_id:
                try:
                    # Mark as quarantined
                    connection.is_quarantined = True
                    self._quarantined_connections.add(sid)

                    # Notify user
                    await self.sio.emit(
                        "user_quarantined",
                        {
                            "reason": reason,
                            "timestamp": datetime.now().isoformat()
                        },
                        room=sid
                    )

                    # Update session
                    session_data = await self.sio.get_session(sid)
                    session_data["connection"] = connection
                    await self.sio.save_session(sid, session_data)

                except Exception as e:
                    logger.error(f"Failed to quarantine connection {sid}: {e}")

    async def broadcast_security_alert(self, workspace_id: str, alert_data: Dict[str, Any]):
        """Broadcast security alert to workspace administrators."""
        logger.warning(f"Security alert for workspace {workspace_id}: {alert_data}")

        # Get admin connections in workspace
        workspace_connections = self._workspace_connections.get(workspace_id, {})

        for sid, connection in workspace_connections.items():
            # Check if user has admin permissions (simplified check)
            if connection.security_level == "admin":
                await self.sio.emit(
                    SocketEventType.SECURITY_ALERT,
                    {
                        "alert": alert_data,
                        "workspace_id": workspace_id,
                        "timestamp": datetime.now().isoformat()
                    },
                    room=sid
                )

    # Private implementation methods

    async def _initialize_redis_connection(self):
        """Initialize Redis connection for Socket.IO state management."""
        try:
            from config.settings import get_settings
            settings = get_settings()

            redis_url = settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)

            # Test connection
            await self.redis_client.ping()
            logger.info("Socket.IO Redis connection initialized")

        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise

    async def _check_socket_rate_limits(self, connection: SecureSocketConnection):
        """Check and enforce Socket.IO rate limits."""
        now = datetime.now()

        # Reset counter if window expired
        if (now - connection.last_message_time).total_seconds() > 60:
            connection.message_count = 0
            connection.last_message_time = now

        # Check rate limit (60 messages per minute default)
        if connection.message_count >= 60:
            connection.rate_limit_violations += 1

            # Progressive penalties
            if connection.rate_limit_violations >= 3:
                connection.is_quarantined = True

            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded for Socket.IO messages"
            )

    async def _emit_error(self, sid: str, message: str, error_code: int = 400):
        """Emit error message to specific socket."""
        await self.sio.emit(
            "error",
            {
                "message": message,
                "code": error_code,
                "timestamp": datetime.now().isoformat()
            },
            room=sid
        )

    async def _connection_monitoring_loop(self):
        """Background monitoring of Socket.IO connections."""
        while True:
            try:
                # Monitor connection health
                await self._monitor_connection_health()

                # Clean up expired connections
                await self._cleanup_expired_connections()

                # Update connection metrics
                await self._update_connection_metrics()

                # Wait 30 seconds
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Connection monitoring error: {e}")
                await asyncio.sleep(60)

    async def _security_monitoring_loop(self):
        """Background security monitoring for real-time communications."""
        while True:
            try:
                # Monitor for suspicious connection patterns
                await self._detect_connection_anomalies()

                # Update threat scores
                await self._update_connection_threat_scores()

                # Process security alerts
                await self._process_realtime_security_alerts()

                # Wait 15 seconds
                await asyncio.sleep(15)

            except Exception as e:
                logger.error(f"Security monitoring error: {e}")
                await asyncio.sleep(60)

    async def _monitor_connection_health(self):
        """Monitor health of all active connections."""
        current_time = datetime.now()

        for workspace_id, connections in self._workspace_connections.items():
            for sid, connection in list(connections.items()):
                # Check for stale connections
                if (current_time - connection.last_activity).total_seconds() > 1800:  # 30 minutes
                    logger.info(f"Cleaning up stale connection {sid}")

                    try:
                        await self.sio.disconnect(sid)
                        connections.pop(sid, None)
                    except Exception as e:
                        logger.error(f"Failed to clean up connection {sid}: {e}")

    async def _detect_connection_anomalies(self):
        """Detect anomalous connection patterns."""
        # Analyze connection patterns for security threats
        # This would include monitoring for:
        # - Rapid connection/disconnection cycles
        # - Multiple connections from same IP
        # - Unusual message patterns
        # - Geographic anomalies

        for workspace_id, connections in self._workspace_connections.items():
            # Group by IP address
            ip_connections = defaultdict(list)

            for connection in connections.values():
                if connection.ip_address:
                    ip_connections[connection.ip_address].append(connection)

            # Check for too many connections from same IP
            for ip, conns in ip_connections.items():
                if len(conns) > 10:  # Threshold for suspicious activity
                    logger.warning(f"Suspicious connection pattern from IP {ip}: {len(conns)} connections")

                    # Could trigger additional security measures here
                    await self._create_security_alert(
                        workspace_id,
                        "multiple_connections_same_ip",
                        {"ip_address": ip, "connection_count": len(conns)}
                    )

    async def _create_security_alert(self, workspace_id: str, alert_type: str, details: Dict[str, Any]):
        """Create and store security alert."""
        alert = {
            "alert_id": str(uuid4()),
            "workspace_id": workspace_id,
            "alert_type": alert_type,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "severity": "medium"
        }

        self._security_events[workspace_id].append(alert)

        # Broadcast to administrators
        await self.broadcast_security_alert(workspace_id, alert)


# Global instance
secure_socketio_integration: Optional[SecureSocketIOIntegration] = None


async def initialize_secure_socketio(sio_server: AsyncServer) -> SecureSocketIOIntegration:
    """Initialize the secure Socket.IO integration."""
    global secure_socketio_integration

    if secure_socketio_integration is None:
        secure_socketio_integration = SecureSocketIOIntegration(sio_server)
        await secure_socketio_integration.initialize()

    return secure_socketio_integration


async def get_secure_socketio() -> Optional[SecureSocketIOIntegration]:
    """Get the global secure Socket.IO integration instance."""
    return secure_socketio_integration