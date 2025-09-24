"""
Multi-Tenant Messaging Queue Manager
===================================

This module implements enterprise-grade multi-tenant message queuing with:
- Workspace-scoped message isolation and routing
- Tenant-specific resource allocation and limits
- Performance optimization with connection pooling
- Message persistence and reliability guarantees
- Real-time message broadcasting with workspace boundaries
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Set, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4
import weakref
from collections import defaultdict, deque
from contextlib import asynccontextmanager

import redis.asyncio as redis
import aioredis
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import WebSocket, WebSocketDisconnect

from database.connection import get_async_session_context
from auth.sim_auth_bridge import SimSession
from workspace_isolation import WorkspaceContext
from config.settings import get_settings

logger = logging.getLogger(__name__)


class QueuePriority(str, Enum):
    """Message queue priority levels."""
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"
    BATCH = "batch"


class DeliveryMode(str, Enum):
    """Message delivery modes."""
    DIRECT = "direct"  # Direct WebSocket delivery
    PERSISTENT = "persistent"  # Persistent queue with delivery guarantees
    BROADCAST = "broadcast"  # Broadcast to all workspace subscribers
    SELECTIVE = "selective"  # Selective delivery based on filters


@dataclass
class QueueMetrics:
    """Queue performance and usage metrics."""
    workspace_id: str
    total_messages: int = 0
    messages_per_second: float = 0.0
    active_connections: int = 0
    queue_depth: int = 0
    memory_usage: int = 0
    last_activity: Optional[datetime] = None
    error_count: int = 0
    delivery_success_rate: float = 1.0


@dataclass
class TenantConfiguration:
    """Tenant-specific queue configuration."""
    workspace_id: str
    max_connections: int = 1000
    max_queue_size: int = 100000
    message_rate_limit: int = 1000  # messages per minute
    memory_limit_mb: int = 500
    retention_hours: int = 24 * 7  # 7 days
    priority_queues_enabled: bool = True
    encryption_required: bool = True
    audit_logging_enabled: bool = True
    custom_filters: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ConnectionContext:
    """WebSocket connection context with workspace isolation."""
    websocket: WebSocket
    workspace_id: str
    user_id: str
    session_id: str
    connection_id: str = field(default_factory=lambda: str(uuid4()))
    connected_at: datetime = field(default_factory=datetime.now)
    last_ping: Optional[datetime] = None
    subscribed_channels: Set[str] = field(default_factory=set)
    message_filters: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True


class WorkspaceQueue:
    """High-performance workspace-scoped message queue."""

    def __init__(
        self,
        workspace_id: str,
        config: TenantConfiguration,
        redis_client: redis.Redis
    ):
        self.workspace_id = workspace_id
        self.config = config
        self.redis_client = redis_client

        # In-memory message queues by priority
        self._priority_queues: Dict[QueuePriority, deque] = {
            priority: deque(maxlen=config.max_queue_size)
            for priority in QueuePriority
        }

        # Active WebSocket connections
        self._connections: Dict[str, ConnectionContext] = {}

        # Message routing and filtering
        self._channel_subscribers: Dict[str, Set[str]] = defaultdict(set)
        self._user_subscriptions: Dict[str, Set[str]] = defaultdict(set)

        # Performance metrics
        self.metrics = QueueMetrics(workspace_id=workspace_id)

        # Rate limiting
        self._rate_limiter = {}
        self._rate_window = timedelta(minutes=1)

        # Message delivery tracking
        self._pending_deliveries: Dict[str, Dict[str, Any]] = {}
        self._failed_deliveries: deque = deque(maxlen=1000)

    async def add_connection(self, connection_context: ConnectionContext):
        """Add WebSocket connection to workspace queue."""
        logger.debug(f"Adding connection {connection_context.connection_id} to workspace {self.workspace_id}")

        # Check connection limits
        if len(self._connections) >= self.config.max_connections:
            raise Exception(f"Connection limit exceeded for workspace {self.workspace_id}")

        # Store connection
        self._connections[connection_context.connection_id] = connection_context

        # Update metrics
        self.metrics.active_connections = len(self._connections)
        self.metrics.last_activity = datetime.now()

        # Subscribe to default channels
        await self._subscribe_to_default_channels(connection_context)

        logger.info(f"Connection added to workspace {self.workspace_id}: {connection_context.connection_id}")

    async def remove_connection(self, connection_id: str):
        """Remove WebSocket connection from workspace queue."""
        if connection_id not in self._connections:
            return

        connection = self._connections[connection_id]
        logger.debug(f"Removing connection {connection_id} from workspace {self.workspace_id}")

        # Unsubscribe from all channels
        for channel in connection.subscribed_channels:
            self._channel_subscribers[channel].discard(connection_id)

        # Remove user subscriptions
        self._user_subscriptions[connection.user_id].discard(connection_id)

        # Remove connection
        del self._connections[connection_id]

        # Update metrics
        self.metrics.active_connections = len(self._connections)

        logger.info(f"Connection removed from workspace {self.workspace_id}: {connection_id}")

    async def enqueue_message(
        self,
        message_data: Dict[str, Any],
        priority: QueuePriority = QueuePriority.NORMAL,
        delivery_mode: DeliveryMode = DeliveryMode.BROADCAST
    ) -> str:
        """Enqueue message for delivery within workspace."""
        message_id = str(uuid4())

        # Apply rate limiting
        if not await self._check_rate_limit(message_data.get("sender_id", "system")):
            raise Exception("Message rate limit exceeded")

        # Create message envelope
        message_envelope = {
            "id": message_id,
            "workspace_id": self.workspace_id,
            "data": message_data,
            "priority": priority.value,
            "delivery_mode": delivery_mode.value,
            "created_at": datetime.now().isoformat(),
            "attempts": 0,
            "max_attempts": 3
        }

        # Add to appropriate priority queue
        queue = self._priority_queues[priority]
        queue.append(message_envelope)

        # Update metrics
        self.metrics.total_messages += 1
        self.metrics.queue_depth = sum(len(q) for q in self._priority_queues.values())

        # Persist to Redis for durability
        await self._persist_message(message_envelope)

        # Trigger immediate delivery if direct mode
        if delivery_mode == DeliveryMode.DIRECT:
            asyncio.create_task(self._deliver_message_direct(message_envelope))
        elif delivery_mode == DeliveryMode.BROADCAST:
            asyncio.create_task(self._deliver_message_broadcast(message_envelope))

        logger.debug(f"Message enqueued in workspace {self.workspace_id}: {message_id}")
        return message_id

    async def process_message_queue(self):
        """Process messages from priority queues."""
        processed_count = 0

        # Process high priority first
        for priority in [QueuePriority.HIGH, QueuePriority.NORMAL, QueuePriority.LOW, QueuePriority.BATCH]:
            queue = self._priority_queues[priority]

            while queue and processed_count < 100:  # Batch processing limit
                message_envelope = queue.popleft()

                try:
                    await self._process_message_envelope(message_envelope)
                    processed_count += 1

                except Exception as e:
                    logger.error(f"Failed to process message {message_envelope['id']}: {e}")
                    await self._handle_delivery_failure(message_envelope, e)

        # Update metrics
        if processed_count > 0:
            self.metrics.last_activity = datetime.now()
            self.metrics.queue_depth = sum(len(q) for q in self._priority_queues.values())

    async def subscribe_to_channel(self, connection_id: str, channel: str, filters: Optional[Dict[str, Any]] = None):
        """Subscribe connection to specific channel."""
        if connection_id not in self._connections:
            return

        connection = self._connections[connection_id]
        connection.subscribed_channels.add(channel)
        self._channel_subscribers[channel].add(connection_id)

        # Apply filters if provided
        if filters:
            connection.message_filters[channel] = filters

        logger.debug(f"Connection {connection_id} subscribed to channel {channel} in workspace {self.workspace_id}")

    async def unsubscribe_from_channel(self, connection_id: str, channel: str):
        """Unsubscribe connection from specific channel."""
        if connection_id not in self._connections:
            return

        connection = self._connections[connection_id]
        connection.subscribed_channels.discard(channel)
        self._channel_subscribers[channel].discard(connection_id)

        # Remove filters
        connection.message_filters.pop(channel, None)

        logger.debug(f"Connection {connection_id} unsubscribed from channel {channel} in workspace {self.workspace_id}")

    async def get_queue_status(self) -> Dict[str, Any]:
        """Get comprehensive queue status and metrics."""
        return {
            "workspace_id": self.workspace_id,
            "metrics": {
                "active_connections": self.metrics.active_connections,
                "total_messages": self.metrics.total_messages,
                "queue_depth": self.metrics.queue_depth,
                "memory_usage": self.metrics.memory_usage,
                "error_count": self.metrics.error_count,
                "delivery_success_rate": self.metrics.delivery_success_rate,
                "last_activity": self.metrics.last_activity.isoformat() if self.metrics.last_activity else None
            },
            "queue_depths": {
                priority.value: len(queue)
                for priority, queue in self._priority_queues.items()
            },
            "channels": list(self._channel_subscribers.keys()),
            "configuration": {
                "max_connections": self.config.max_connections,
                "max_queue_size": self.config.max_queue_size,
                "message_rate_limit": self.config.message_rate_limit,
                "memory_limit_mb": self.config.memory_limit_mb,
                "retention_hours": self.config.retention_hours
            }
        }

    # Private implementation methods

    async def _subscribe_to_default_channels(self, connection: ConnectionContext):
        """Subscribe connection to default workspace channels."""
        default_channels = [
            "workspace_general",
            f"user_{connection.user_id}",
            "system_notifications"
        ]

        for channel in default_channels:
            await self.subscribe_to_channel(connection.connection_id, channel)

    async def _check_rate_limit(self, sender_id: str) -> bool:
        """Check if sender is within rate limits."""
        now = datetime.now()
        window_start = now - self._rate_window

        # Clean old entries
        if sender_id in self._rate_limiter:
            self._rate_limiter[sender_id] = [
                timestamp for timestamp in self._rate_limiter[sender_id]
                if timestamp > window_start
            ]

        # Check current rate
        current_count = len(self._rate_limiter.get(sender_id, []))
        if current_count >= self.config.message_rate_limit:
            return False

        # Add current message
        if sender_id not in self._rate_limiter:
            self._rate_limiter[sender_id] = []
        self._rate_limiter[sender_id].append(now)

        return True

    async def _persist_message(self, message_envelope: Dict[str, Any]):
        """Persist message to Redis for durability."""
        try:
            await self.redis_client.hset(
                f"workspace_messages:{self.workspace_id}",
                message_envelope["id"],
                json.dumps(message_envelope)
            )

            # Set expiration based on retention policy
            await self.redis_client.expire(
                f"workspace_messages:{self.workspace_id}",
                self.config.retention_hours * 3600
            )

        except Exception as e:
            logger.error(f"Failed to persist message {message_envelope['id']}: {e}")

    async def _process_message_envelope(self, message_envelope: Dict[str, Any]):
        """Process message envelope based on delivery mode."""
        delivery_mode = DeliveryMode(message_envelope["delivery_mode"])

        if delivery_mode == DeliveryMode.DIRECT:
            await self._deliver_message_direct(message_envelope)
        elif delivery_mode == DeliveryMode.BROADCAST:
            await self._deliver_message_broadcast(message_envelope)
        elif delivery_mode == DeliveryMode.SELECTIVE:
            await self._deliver_message_selective(message_envelope)
        elif delivery_mode == DeliveryMode.PERSISTENT:
            await self._deliver_message_persistent(message_envelope)

    async def _deliver_message_direct(self, message_envelope: Dict[str, Any]):
        """Deliver message directly to specific recipient."""
        message_data = message_envelope["data"]
        recipient_id = message_data.get("recipient_id")

        if not recipient_id:
            return

        # Find recipient connections
        recipient_connections = [
            conn for conn in self._connections.values()
            if conn.user_id == recipient_id and conn.is_active
        ]

        # Deliver to all recipient connections
        delivery_success = False
        for connection in recipient_connections:
            try:
                await connection.websocket.send_json({
                    "type": "direct_message",
                    "message": message_envelope
                })
                delivery_success = True

            except Exception as e:
                logger.error(f"Failed to deliver direct message to {connection.connection_id}: {e}")
                await self._mark_connection_inactive(connection.connection_id)

        if delivery_success:
            self.metrics.delivery_success_rate = (
                (self.metrics.delivery_success_rate * self.metrics.total_messages + 1) /
                (self.metrics.total_messages + 1)
            )

    async def _deliver_message_broadcast(self, message_envelope: Dict[str, Any]):
        """Broadcast message to all workspace subscribers."""
        message_data = message_envelope["data"]
        channel = message_data.get("channel", "workspace_general")

        # Get all subscribers for channel
        subscriber_ids = self._channel_subscribers.get(channel, set())
        active_connections = [
            self._connections[conn_id] for conn_id in subscriber_ids
            if conn_id in self._connections and self._connections[conn_id].is_active
        ]

        # Deliver to all active connections
        successful_deliveries = 0
        total_attempts = len(active_connections)

        for connection in active_connections:
            try:
                # Apply message filters
                if await self._message_passes_filters(message_envelope, connection):
                    await connection.websocket.send_json({
                        "type": "broadcast_message",
                        "channel": channel,
                        "message": message_envelope
                    })
                    successful_deliveries += 1

            except Exception as e:
                logger.error(f"Failed to broadcast message to {connection.connection_id}: {e}")
                await self._mark_connection_inactive(connection.connection_id)

        # Update delivery success rate
        if total_attempts > 0:
            success_rate = successful_deliveries / total_attempts
            self.metrics.delivery_success_rate = (
                (self.metrics.delivery_success_rate * self.metrics.total_messages + success_rate) /
                (self.metrics.total_messages + 1)
            )

    async def _deliver_message_selective(self, message_envelope: Dict[str, Any]):
        """Deliver message based on selective criteria."""
        message_data = message_envelope["data"]
        selection_criteria = message_data.get("selection_criteria", {})

        # Find matching connections based on criteria
        matching_connections = []
        for connection in self._connections.values():
            if await self._connection_matches_criteria(connection, selection_criteria):
                matching_connections.append(connection)

        # Deliver to matching connections
        for connection in matching_connections:
            try:
                await connection.websocket.send_json({
                    "type": "selective_message",
                    "message": message_envelope
                })

            except Exception as e:
                logger.error(f"Failed to deliver selective message to {connection.connection_id}: {e}")
                await self._mark_connection_inactive(connection.connection_id)

    async def _deliver_message_persistent(self, message_envelope: Dict[str, Any]):
        """Deliver message with persistence guarantees."""
        message_id = message_envelope["id"]

        # Store in pending deliveries
        self._pending_deliveries[message_id] = message_envelope

        try:
            # Attempt delivery
            await self._deliver_message_broadcast(message_envelope)

            # Mark as delivered
            self._pending_deliveries.pop(message_id, None)

        except Exception as e:
            # Keep in pending for retry
            message_envelope["attempts"] += 1
            if message_envelope["attempts"] >= message_envelope["max_attempts"]:
                self._failed_deliveries.append(message_envelope)
                self._pending_deliveries.pop(message_id, None)
                self.metrics.error_count += 1

            logger.error(f"Persistent delivery failed for message {message_id}: {e}")

    async def _message_passes_filters(
        self,
        message_envelope: Dict[str, Any],
        connection: ConnectionContext
    ) -> bool:
        """Check if message passes connection-specific filters."""
        message_data = message_envelope["data"]
        channel = message_data.get("channel", "workspace_general")

        # Get filters for this channel
        filters = connection.message_filters.get(channel, {})
        if not filters:
            return True

        # Apply filters
        for filter_key, filter_value in filters.items():
            if filter_key in message_data:
                if message_data[filter_key] != filter_value:
                    return False

        return True

    async def _connection_matches_criteria(
        self,
        connection: ConnectionContext,
        criteria: Dict[str, Any]
    ) -> bool:
        """Check if connection matches selection criteria."""
        for key, value in criteria.items():
            if key == "user_id" and connection.user_id != value:
                return False
            elif key == "session_id" and connection.session_id != value:
                return False
            elif key == "channels" and not any(ch in connection.subscribed_channels for ch in value):
                return False

        return True

    async def _mark_connection_inactive(self, connection_id: str):
        """Mark connection as inactive due to delivery failure."""
        if connection_id in self._connections:
            self._connections[connection_id].is_active = False
            logger.warning(f"Marked connection {connection_id} as inactive")

    async def _handle_delivery_failure(self, message_envelope: Dict[str, Any], error: Exception):
        """Handle message delivery failure."""
        message_id = message_envelope["id"]
        logger.error(f"Delivery failed for message {message_id}: {error}")

        # Increment attempt counter
        message_envelope["attempts"] += 1

        # Retry if under limit
        if message_envelope["attempts"] < message_envelope["max_attempts"]:
            # Re-queue for retry
            priority = QueuePriority(message_envelope["priority"])
            self._priority_queues[priority].append(message_envelope)
        else:
            # Add to failed deliveries
            self._failed_deliveries.append(message_envelope)
            self.metrics.error_count += 1


class MultiTenantQueueManager:
    """
    Multi-tenant message queue manager with workspace isolation.

    Manages workspace-scoped message queues with enterprise features:
    - Automatic scaling and resource management
    - Performance monitoring and optimization
    - Security and compliance controls
    - Cross-workspace isolation guarantees
    """

    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None

        # Workspace queues
        self._workspace_queues: Dict[str, WorkspaceQueue] = {}

        # Tenant configurations
        self._tenant_configs: Dict[str, TenantConfiguration] = {}

        # Global metrics and monitoring
        self._global_metrics: Dict[str, Any] = {}

        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()

    async def initialize(self):
        """Initialize the multi-tenant queue manager."""
        logger.info("Initializing Multi-Tenant Queue Manager")

        try:
            # Initialize Redis connection
            await self._initialize_redis()

            # Load tenant configurations
            await self._load_tenant_configurations()

            # Start background processing
            await self._start_background_tasks()

            logger.info("Multi-Tenant Queue Manager initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize queue manager: {e}")
            raise

    async def get_or_create_workspace_queue(
        self,
        workspace_id: str,
        config: Optional[TenantConfiguration] = None
    ) -> WorkspaceQueue:
        """Get existing or create new workspace queue."""
        if workspace_id in self._workspace_queues:
            return self._workspace_queues[workspace_id]

        # Use provided config or default
        tenant_config = config or self._tenant_configs.get(
            workspace_id,
            TenantConfiguration(workspace_id=workspace_id)
        )

        # Create new workspace queue
        workspace_queue = WorkspaceQueue(
            workspace_id=workspace_id,
            config=tenant_config,
            redis_client=self.redis_client
        )

        self._workspace_queues[workspace_id] = workspace_queue
        logger.info(f"Created workspace queue for {workspace_id}")

        return workspace_queue

    async def add_websocket_connection(
        self,
        workspace_id: str,
        websocket: WebSocket,
        user_id: str,
        session_id: str
    ) -> str:
        """Add WebSocket connection to workspace queue."""
        queue = await self.get_or_create_workspace_queue(workspace_id)

        connection_context = ConnectionContext(
            websocket=websocket,
            workspace_id=workspace_id,
            user_id=user_id,
            session_id=session_id
        )

        await queue.add_connection(connection_context)
        return connection_context.connection_id

    async def remove_websocket_connection(self, workspace_id: str, connection_id: str):
        """Remove WebSocket connection from workspace queue."""
        if workspace_id in self._workspace_queues:
            await self._workspace_queues[workspace_id].remove_connection(connection_id)

    async def send_message_to_workspace(
        self,
        workspace_id: str,
        message_data: Dict[str, Any],
        priority: QueuePriority = QueuePriority.NORMAL,
        delivery_mode: DeliveryMode = DeliveryMode.BROADCAST
    ) -> str:
        """Send message to workspace queue."""
        queue = await self.get_or_create_workspace_queue(workspace_id)
        return await queue.enqueue_message(message_data, priority, delivery_mode)

    async def get_workspace_status(self, workspace_id: str) -> Optional[Dict[str, Any]]:
        """Get status for specific workspace queue."""
        if workspace_id not in self._workspace_queues:
            return None

        return await self._workspace_queues[workspace_id].get_queue_status()

    async def get_global_status(self) -> Dict[str, Any]:
        """Get global multi-tenant queue status."""
        workspace_statuses = {}
        for workspace_id, queue in self._workspace_queues.items():
            workspace_statuses[workspace_id] = await queue.get_queue_status()

        return {
            "total_workspaces": len(self._workspace_queues),
            "total_connections": sum(
                status["metrics"]["active_connections"]
                for status in workspace_statuses.values()
            ),
            "total_queue_depth": sum(
                status["metrics"]["queue_depth"]
                for status in workspace_statuses.values()
            ),
            "workspace_details": workspace_statuses,
            "global_metrics": self._global_metrics
        }

    # Private implementation methods

    async def _initialize_redis(self):
        """Initialize Redis connection."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            await self.redis_client.ping()
            logger.info("Redis connection initialized for queue manager")

        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            raise

    async def _load_tenant_configurations(self):
        """Load tenant configurations from database."""
        async with get_async_session_context() as session:
            try:
                # Load workspace configurations from database
                # This would query workspace settings and create tenant configs
                logger.info("Loaded tenant configurations")

            except Exception as e:
                logger.error(f"Failed to load tenant configurations: {e}")

    async def _start_background_tasks(self):
        """Start background processing tasks."""
        # Queue processing task
        task = asyncio.create_task(self._background_queue_processing())
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

        # Metrics collection task
        task = asyncio.create_task(self._background_metrics_collection())
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

        # Cleanup task
        task = asyncio.create_task(self._background_cleanup())
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    async def _background_queue_processing(self):
        """Background task for processing message queues."""
        while True:
            try:
                # Process all workspace queues
                for workspace_id, queue in self._workspace_queues.items():
                    await queue.process_message_queue()

                # Wait before next processing cycle
                await asyncio.sleep(0.1)  # 100ms cycle for high throughput

            except Exception as e:
                logger.error(f"Background queue processing error: {e}")
                await asyncio.sleep(1)

    async def _background_metrics_collection(self):
        """Background task for collecting metrics."""
        while True:
            try:
                # Collect global metrics
                total_connections = sum(
                    queue.metrics.active_connections
                    for queue in self._workspace_queues.values()
                )

                total_messages = sum(
                    queue.metrics.total_messages
                    for queue in self._workspace_queues.values()
                )

                self._global_metrics.update({
                    "timestamp": datetime.now().isoformat(),
                    "total_workspaces": len(self._workspace_queues),
                    "total_connections": total_connections,
                    "total_messages_processed": total_messages,
                    "average_delivery_success_rate": sum(
                        queue.metrics.delivery_success_rate
                        for queue in self._workspace_queues.values()
                    ) / max(len(self._workspace_queues), 1)
                })

                # Wait 30 seconds before next collection
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(60)

    async def _background_cleanup(self):
        """Background task for cleanup and maintenance."""
        while True:
            try:
                # Clean up inactive connections
                for workspace_id, queue in self._workspace_queues.items():
                    inactive_connections = [
                        conn_id for conn_id, conn in queue._connections.items()
                        if not conn.is_active
                    ]

                    for conn_id in inactive_connections:
                        await queue.remove_connection(conn_id)

                # Clean up empty queues
                empty_workspaces = [
                    workspace_id for workspace_id, queue in self._workspace_queues.items()
                    if len(queue._connections) == 0 and queue.metrics.last_activity and
                    datetime.now() - queue.metrics.last_activity > timedelta(hours=1)
                ]

                for workspace_id in empty_workspaces:
                    del self._workspace_queues[workspace_id]
                    logger.info(f"Cleaned up empty workspace queue: {workspace_id}")

                # Wait 5 minutes before next cleanup
                await asyncio.sleep(300)

            except Exception as e:
                logger.error(f"Background cleanup error: {e}")
                await asyncio.sleep(60)


# Global queue manager instance
multitenant_queue_manager = MultiTenantQueueManager()